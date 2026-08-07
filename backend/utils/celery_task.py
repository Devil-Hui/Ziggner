from celery import shared_task
from celery.result import AsyncResult
from celery.exceptions import SoftTimeLimitExceeded, TimeLimitExceeded
from django.utils import timezone
from celery.schedules import crontab
import logging
import signal
import inspect

logger = logging.getLogger(__name__)


class CeleryTask:
    """
    Celery 任务基类（带超时处理和队列管理）
    使用方法：
    class MyTask(CeleryTask):
        task_name = "myapp.mytask"
        queue = "default"  # 可选，指定队列
        
        def exec(self, task_self, *args, **kwargs):
            # 任务实现
    """
    
    # 类属性必须被子类覆盖
    task_name = None
    default_soft_time_limit = 300  # 5分钟
    default_time_limit = 600       # 10分钟
    queue = None                   # 默认队列，可由子类覆盖
    
    # 重试配置
    retry_on_exceptions = (Exception,)  # 默认遇到所有异常重试
    max_retries = 3                     # 最大重试次数
    retry_backoff = True                # 指数退避重试
    retry_jitter = True                 # 随机抖动
    
    # 存储注册后的任务函数
    _task_func = None
    
    @classmethod
    def get_task_result(cls, task_id):
        """获取任务结果对象"""
        return AsyncResult(task_id)
    
    @classmethod
    def get_task_status(cls, task_id):
        """
        获取任务状态信息
        
        Args:
            task_id: 任务ID
            
        Returns:
            dict: 包含任务状态信息的字典
        """
        result = cls.get_task_result(task_id)
        return {
            'id': task_id,
            'state': result.state,
            'result': result.result,
            'successful': result.successful(),
            'failed': result.failed(),
            'ready': result.ready(),
        }
    
    @classmethod
    def _get_task_options(cls):
        """获取任务选项"""
        options = {
            'bind': True,
            'soft_time_limit': cls.default_soft_time_limit,
            'time_limit': cls.default_time_limit,
            'autoretry_for': cls.retry_on_exceptions,
            'retry_backoff': cls.retry_backoff,
            'retry_jitter': cls.retry_jitter,
            'retry_kwargs': {'max_retries': cls.max_retries},
        }
        
        # 确保任务名称正确
        task_name = cls.task_name
        if not task_name:
            task_name = f"{cls.__module__}.{cls.__name__}"
        options['name'] = task_name
        
        # 如果指定了队列，添加到选项中
        if cls.queue:
            options['queue'] = cls.queue
            
        return options
    
    @classmethod
    def _get_task_func(cls):
        """创建被装饰的Celery任务函数"""
        options = cls._get_task_options()
        
        # 获取或创建任务名称
        task_name = options['name']
        
        @shared_task(**options)
        def _task_wrapper(task_self, *args, **kwargs):
            """任务包装器，处理超时和重试"""
            instance = cls()
            
            # 设置信号处理（Unix系统）
            def handle_soft_timeout(signum, frame):
                raise SoftTimeLimitExceeded()
            
            original_handler = signal.signal(signal.SIGUSR1, handle_soft_timeout)
            
            try:
                queue_info = f"队列:{task_self.request.delivery_info.get('routing_key', 'default') if hasattr(task_self.request, 'delivery_info') else cls.queue or 'default'}"
                logger.info(f"开始任务 {task_name} [ID:{task_self.request.id}] {queue_info}")
                result = instance.exec(task_self, *args, **kwargs)
                logger.info(f"完成任务 {task_name} [ID:{task_self.request.id}]")
                return result
                
            except SoftTimeLimitExceeded:
                logger.warning(f"任务软超时 {task_name} [ID:{task_self.request.id}]")
                instance.on_soft_timeout(task_self, *args, **kwargs)
                raise  # 触发自动重试
                
            except TimeLimitExceeded:
                logger.error(f"任务硬超时 {task_name} [ID:{task_self.request.id}]")
                instance.on_hard_timeout(task_self, *args, **kwargs)
                raise
                
            except Exception as e:
                logger.error(f"任务异常 {task_name} [ID:{task_self.request.id}]: {str(e)}")
                instance.on_failure(task_self, e, *args, **kwargs)
                raise
                
            finally:
                signal.signal(signal.SIGUSR1, original_handler)
                instance.on_cleanup(task_self, *args, **kwargs)
        
        # 保存任务函数以便后续使用
        cls._task_func = _task_wrapper
        
        # 输出任务注册信息
        logger.info(f"任务注册成功: {task_name}, 队列: {cls.queue or 'default'}")
        
        # 确保返回的是被装饰后的函数
        return _task_wrapper
    
    @classmethod
    def register(cls):
        """
        注册任务并返回任务函数
        这个方法应该在模块加载时调用一次
        """
        if cls._task_func is None:
            cls._task_func = cls._get_task_func()
        return cls._task_func
    
    def exec(self, task_self, *args, **kwargs):
        """
        任务主逻辑（必须实现）
        :param task_self: Celery任务实例
        :return: 任务结果
        """
        logger.info(f"执行任务: {self.task_name}, 参数: {args}, {kwargs}")
        raise NotImplementedError("必须实现exec方法")
    
    def on_soft_timeout(self, task_self, *args, **kwargs):
        """软超时处理（可覆盖）"""
        logger.warning(f"任务即将超时: {self.task_name}")
    
    def on_hard_timeout(self, task_self, *args, **kwargs):
        """硬超时处理（可覆盖）"""
        logger.error(f"任务被强制终止: {self.task_name}")
    
    def on_failure(self, task_self, exception, *args, **kwargs):
        """失败处理（可覆盖）"""
        logger.error(f"任务失败: {self.task_name}, 错误: {str(exception)}")
    
    def on_cleanup(self, task_self, *args, **kwargs):
        """清理处理（可覆盖）"""
        pass
    
    @classmethod
    def run(cls, *args, **kwargs):
        """立即执行任务"""
        queue = kwargs.pop('queue', cls.queue)
        task_func = cls.register()
        
        logger.info(f"调用任务: {cls.task_name}, 队列: {queue or 'default'}, 参数: {args}, {kwargs}")
        
        if queue:
            return task_func.apply_async(args=args, kwargs=kwargs, queue=queue)
        else:
            return task_func.delay(*args, **kwargs)
    
    @classmethod
    def run_with_timeout(cls, soft_timeout, hard_timeout, *args, **kwargs):
        """带自定义超时的任务执行"""
        queue = kwargs.pop('queue', cls.queue)
        task_func = cls.register()
        
        options = {
            'soft_time_limit': soft_timeout,
            'time_limit': hard_timeout
        }
        
        if queue:
            options['queue'] = queue
            
        return task_func.apply_async(args=args, kwargs=kwargs, **options)
    
    @classmethod
    def run_at(cls, eta, *args, **kwargs):
        """定时执行任务"""
        queue = kwargs.pop('queue', cls.queue)
        task_func = cls.register()
        
        options = {'eta': eta}
        if queue:
            options['queue'] = queue
            
        return task_func.apply_async(args=args, kwargs=kwargs, **options)
    
    @classmethod
    def run_after(cls, countdown, *args, **kwargs):
        """延迟执行任务"""
        queue = kwargs.pop('queue', cls.queue)
        task_func = cls.register()
        
        options = {'countdown': countdown}
        if queue:
            options['queue'] = queue
            
        return task_func.apply_async(args=args, kwargs=kwargs, **options)
        
    @classmethod
    def run_daily(cls, hour=0, minute=0, *args, **kwargs):
        """每天定时执行任务"""
        queue = kwargs.pop('queue', cls.queue)
        task_func = cls.register()
        
        options = {
            'schedule': crontab(hour=hour, minute=minute)
        }
        if queue:
            options['queue'] = queue
            
        return task_func.apply_async(args=args, kwargs=kwargs, **options)
    
    @classmethod
    def run_weekly(cls, day_of_week=0, hour=0, minute=0, *args, **kwargs):
        """每周定时执行任务"""
        queue = kwargs.pop('queue', cls.queue)
        task_func = cls.register()
        
        options = {
            'schedule': crontab(day_of_week=day_of_week, hour=hour, minute=minute)
        }
        if queue:
            options['queue'] = queue
            
        return task_func.apply_async(args=args, kwargs=kwargs, **options)
    
    @classmethod
    def run_interval(cls, seconds=0, minutes=0, hours=0, *args, **kwargs):
        """按固定间隔执行任务"""
        queue = kwargs.pop('queue', cls.queue)
        task_func = cls.register()
        
        total_seconds = seconds + minutes * 60 + hours * 3600
        options = {
            'schedule': total_seconds,
        }
        if queue:
            options['queue'] = queue
            
        return task_func.apply_async(args=args, kwargs=kwargs, **options)
    
    @classmethod
    def revoke(cls, task_id, terminate=False):
        """
        撤销任务
        
        Args:
            task_id: 任务ID
            terminate: 是否终止正在运行的任务
        """
        task_func = cls.register()
        task_func.AsyncResult(task_id).revoke(terminate=terminate)
        logger.info(f"撤销任务 {cls.task_name} [ID:{task_id}] {'并终止' if terminate else ''}")
        
        return True
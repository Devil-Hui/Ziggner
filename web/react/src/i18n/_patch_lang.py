# -*- coding: utf-8 -*-
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def patch(path, edits):
    s = open(path, encoding='utf-8').read()
    for anchor, insert in edits:
        if anchor not in s:
            print('MISS in %s: %r' % (path, anchor[:50]))
            continue
        if s.count(anchor) != 1:
            print('NOT_UNIQUE in %s: %r' % (path, anchor[:50]))
            continue
        s = s.replace(anchor, anchor + insert)
    open(path, 'w', encoding='utf-8').write(s)
    print('OK', path)

en_edits = [
    ("      enabled: 'Enabled',\n      disabled: 'Disabled',\n      createdAt: 'Created',",
     "\n      columnColor: 'Color',\n      colorLabel: 'Tag Color',"),
    ("      columnSubmittedAt: 'Submitted',",
     "\n      formAmountPlaceholderPercent: 'e.g. 15',\n      formAmountPlaceholderFixed: 'e.g. 20.00',"),
    ("      columnUsage: 'Usage',",
     "\n      usedCountFormat: 'Used {used}/{total}',"),
    ("      hideMembers: 'Hide Members',",
     "\n      roleLeader: 'Group Leader',\n      roleMember: 'Member',"),
    ("      empty: 'Your cart is empty',\n      startShopping: 'Start Shopping',",
     "\n      emptyDesc: 'Your cart is empty. Browse our products to get started',"),
    ("  store: {",
     "\n    chatDetail: {\n"
     "      filterAll: 'All',\n      filterText: 'Text',\n      filterImage: 'Image',\n      filterCard: 'Card',\n"
     "      conversationList: 'Conversations',\n      loading: 'Loading...',\n      noMessages: 'No messages',\n"
     "      support: 'Support',\n      markReplied: 'Mark Replied',\n      closeConversation: 'Close',\n"
     "      lockBanner: 'This conversation is being handled by {handler}',\n      otherAdmin: 'another admin',\n"
     "      conversationClosed: 'Conversation closed',\n      sendProductCard: 'Send product card',\n"
     "      inputPlaceholder: 'Type a reply...',\n      sending: 'Sending...',\n      uploading: 'Uploading...',\n"
     "      mediaLabel: 'Image/Video',\n      selectConversationHint: 'Select a conversation from the left',\n"
     "      selectProduct: 'Select Product',\n      searchProductPlaceholder: 'Search products...',\n"
     "      searching: 'Searching...',\n      noProductsFound: 'No products found',\n"
     "      searchHint: 'Enter keywords to search products',\n      sendCard: 'Send Card',\n"
     "      statusOpen: 'Open',\n      statusClosed: 'Closed',\n      today: 'Today',\n      yesterday: 'Yesterday',\n"
     "    },\n"
     "    mediaManager: {\n"
     "      title: 'Product Media',\n"
     "      mediaCount: '(images {imageCount}/{maxImages}, videos {videoCount}/{maxVideos})',\n"
     "      addImage: 'Add Image',\n      addVideo: 'Add Video',\n"
     "      dropzoneHint: 'Drag & drop images here, or click to select',\n"
     "      formatHint: 'Supports JPG / PNG / WebP, up to 10MB per image',\n"
     "      editModeHint: ' (edit mode: uploaded directly after cropping)',\n"
     "      createModeHint: ' (cropped & staged, submitted with the form)',\n"
     "      processingDone: 'Done',\n      processingFile: 'Processing: {name}',\n"
     "      emptyHint: 'No media yet. Drag & drop or click the area above to add',\n"
     "      imageLimitReached: 'Image limit reached',\n      uploadFailed: 'Upload failed',\n"
     "      confirmDeleteActive: 'This media is live. Confirm deletion?',\n      deleteFailed: 'Delete failed',\n"
     "      updateFailed: 'Update failed',\n"
     "      videoNotSupported: 'Videos are not supported in edit mode. Please upload via create mode',\n"
     "    },\n"
     "    imageCropper: {\n"
     "      title: 'Crop Image',\n      info: 'Drag to move · resize corners · aspect ratio {ratio}:1',\n"
     "      cancel: 'Cancel',\n      confirm: 'Confirm Crop',\n"
     "    },\n"
     "    notificationFloat: {\n"
     "      title: 'Notifications',\n      empty: 'No notifications',\n"
     "    },\n"),
    ("  store: {\n    nav: {",
     "  store: {\n"
     "    support: {\n"
     "      title: 'Support',\n      newButton: '+ New',\n      newConversationDefault: 'New conversation',\n"
     "      productInquiry: 'Product inquiry: {name}',\n      subjectPlaceholder: 'Subject (optional)',\n"
     "      contentPlaceholder: 'Describe your issue...',\n      uploading: 'Uploading...',\n"
     "      attachLabel: 'Image/Video',\n      cancel: 'Cancel',\n      sending: 'Sending...',\n      send: 'Send',\n"
     "      loading: 'Loading...',\n      noConversations: 'No conversations',\n      conversation: 'Conversation',\n"
     "      noMessages: 'No messages',\n      viewProduct: 'View Product',\n      closeConversation: 'Close',\n"
     "      conversationClosed: 'Conversation closed',\n      messagePlaceholder: 'Type a message...',\n"
     "      selectConversation: 'Select a conversation or start a new one',\n"
     "      startNewConversation: 'New Conversation',\n"
     "    },\n    nav: {"),
]
patch('en.ts', en_edits)

zh_edits = [
    ("      enabled: '启用',\n      disabled: '禁用',\n      createdAt: '创建时间',",
     "\n      columnColor: '颜色',\n      colorLabel: '标签颜色',"),
    ("      columnSubmittedAt: '提交时间',",
     "\n      formAmountPlaceholderPercent: '例：15',\n      formAmountPlaceholderFixed: '例：20.00',"),
    ("      columnUsage: '用量',",
     "\n      usedCountFormat: '已用 {used}/{total}',"),
    ("      hideMembers: '收起成员',",
     "\n      roleLeader: '组长',\n      roleMember: '组员',"),
    ("      empty: '您的购物车是空的',\n      startShopping: '开始购物',",
     "\n      emptyDesc: '您的购物车是空的，去逛逛吧',"),
    ("  store: {",
     "\n    chatDetail: {\n"
     "      filterAll: '全部',\n      filterText: '文本',\n      filterImage: '图片',\n      filterCard: '商品卡片',\n"
     "      conversationList: '对话列表',\n      loading: '加载中...',\n      noMessages: '暂无消息',\n"
     "      support: '客服咨询',\n      markReplied: '标记已处理',\n      closeConversation: '关闭会话',\n"
     "      lockBanner: '该会话正在由 {handler} 处理中',\n      otherAdmin: '其他管理员',\n"
     "      conversationClosed: '对话已关闭',\n      sendProductCard: '发送商品卡片',\n"
     "      inputPlaceholder: '输入回复...',\n      sending: '发送中...',\n      uploading: '上传中...',\n"
     "      mediaLabel: '图片/视频',\n      selectConversationHint: '请从左侧选择一个对话',\n"
     "      selectProduct: '选择商品',\n      searchProductPlaceholder: '搜索商品名称...',\n"
     "      searching: '搜索中...',\n      noProductsFound: '未找到相关商品',\n"
     "      searchHint: '输入关键词搜索商品',\n      sendCard: '发送卡片',\n"
     "      statusOpen: '待处理',\n      statusClosed: '已关闭',\n      today: '今天',\n      yesterday: '昨天',\n"
     "    },\n"
     "    mediaManager: {\n"
     "      title: '商品媒体',\n"
     "      mediaCount: '（图片 {imageCount}/{maxImages}，视频 {videoCount}/{maxVideos}）',\n"
     "      addImage: '添加图片',\n      addVideo: '添加视频',\n"
     "      dropzoneHint: '拖拽图片到此处，或点击选择',\n"
     "      formatHint: '支持 JPG / PNG / WebP，单张最大 10MB',\n"
     "      editModeHint: '（编辑模式：裁剪后直接上传）',\n"
     "      createModeHint: '（裁剪后暂存，随表单提交）',\n"
     "      processingDone: '处理完成',\n      processingFile: '处理中：{name}',\n"
     "      emptyHint: '暂无媒体，拖拽或点击上方区域添加',\n"
     "      imageLimitReached: '图片数量已达上限',\n      uploadFailed: '上传失败',\n"
     "      confirmDeleteActive: '此媒体已上线，确认删除？',\n      deleteFailed: '删除失败',\n"
     "      updateFailed: '更新失败',\n"
     "      videoNotSupported: '编辑模式暂不支持新增视频，请通过创建模式上传',\n"
     "    },\n"
     "    imageCropper: {\n"
     "      title: '裁剪图片',\n      info: '拖拽移动 · 四角缩放 · 宽高比 {ratio}:1',\n"
     "      cancel: '取消',\n      confirm: '确认裁剪',\n"
     "    },\n"
     "    notificationFloat: {\n"
     "      title: '通知',\n      empty: '暂无通知',\n"
     "    },\n"),
    ("  store: {\n    nav: {",
     "  store: {\n"
     "    support: {\n"
     "      title: '客服消息',\n      newButton: '+ 新对话',\n      newConversationDefault: '新对话',\n"
     "      productInquiry: '咨询商品：{name}',\n      subjectPlaceholder: '对话主题（可选）',\n"
     "      contentPlaceholder: '描述您的问题...',\n      uploading: '上传中...',\n"
     "      attachLabel: '图片/视频',\n      cancel: '取消',\n      sending: '发送中...',\n      send: '发送',\n"
     "      loading: '加载中...',\n      noConversations: '暂无对话',\n      conversation: '对话',\n"
     "      noMessages: '暂无消息',\n      viewProduct: '查看商品',\n      closeConversation: '关闭对话',\n"
     "      conversationClosed: '对话已关闭',\n      messagePlaceholder: '输入消息...',\n"
     "      selectConversation: '选择一个对话开始聊天，或创建新对话',\n"
     "      startNewConversation: '创建新对话',\n"
     "    },\n    nav: {"),
]
patch('zh-CN.ts', zh_edits)
print('ALL_DONE')

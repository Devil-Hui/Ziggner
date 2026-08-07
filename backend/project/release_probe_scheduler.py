"""Side-effect-free scheduler used only by the pre-release Beat candidate."""

from __future__ import annotations

import json
import os
import re
import tempfile
from pathlib import Path

from django.db import connection
from django_celery_beat.schedulers import DatabaseScheduler


class ReleaseProbeDatabaseScheduler(DatabaseScheduler):
    """Exercise Beat startup and dependencies without publishing scheduled tasks."""

    marker_root = Path(tempfile.gettempdir()).resolve()

    def setup_schedule(self) -> None:
        if os.getenv('CELERY_BEAT_PROBE_MODE') != '1':
            raise RuntimeError('Release probe scheduler requires CELERY_BEAT_PROBE_MODE=1')

        token = os.getenv('CELERY_BEAT_PROBE_TOKEN', '')
        if not re.fullmatch(r'[A-Za-z0-9_.-]{8,128}', token):
            raise RuntimeError('Invalid CELERY_BEAT_PROBE_TOKEN')

        marker = Path(
            os.getenv(
                'CELERY_BEAT_PROBE_FILE',
                str(self.marker_root / 'ziggner-beat-release-probe.json'),
            ),
        ).resolve()
        if marker == self.marker_root or self.marker_root not in marker.parents:
            raise RuntimeError(
                'CELERY_BEAT_PROBE_FILE must stay under the temporary directory',
            )

        self._schedule = self.all_as_schedule()
        self._initial_read = False

        broker = self.app.connection_for_write()
        try:
            broker.ensure_connection(max_retries=0)
        finally:
            broker.release()

        payload = {
            'token': token,
            'scheduler': f'{DatabaseScheduler.__module__}.{DatabaseScheduler.__name__}',
            'database_vendor': connection.vendor,
            'schedule_entries': len(self._schedule),
            'pid': os.getpid(),
        }
        marker.parent.mkdir(parents=True, exist_ok=True)
        descriptor = os.open(marker, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, 'w', encoding='utf-8') as output:
            json.dump(payload, output, ensure_ascii=True, sort_keys=True)

    def tick(self, *args, **kwargs) -> float:
        return 1.0

    def apply_async(self, *args, **kwargs):
        raise RuntimeError('Release probe scheduler cannot publish tasks')

    def sync(self) -> None:
        return None

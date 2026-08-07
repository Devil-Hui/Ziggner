"""Bounded upload validation shared by API endpoints."""

from __future__ import annotations

import csv
import io
import os
import warnings

from PIL import Image


class UploadValidationError(ValueError):
    pass


_IMAGE_FORMATS = {
    "JPEG": (".jpg", ".jpeg"),
    "PNG": (".png",),
    "GIF": (".gif",),
    "WEBP": (".webp",),
}
_FORMULA_PREFIXES = ("=", "+", "-", "@")
_VIDEO_EXTENSIONS = (".mp4", ".webm", ".mov")


def _validate_plain_filename(name: str, allowed_extensions: tuple[str, ...]) -> str:
    if not name or os.path.basename(name) != name or "\x00" in name:
        raise UploadValidationError("invalid filename")
    extension = os.path.splitext(name)[1].lower()
    if extension not in allowed_extensions:
        raise UploadValidationError("unsupported extension")
    return extension


def validate_image_upload(upload, *, max_bytes: int, max_pixels: int = 25_000_000) -> tuple[str, str]:
    extension = _validate_plain_filename(upload.name, tuple(e for values in _IMAGE_FORMATS.values() for e in values))
    if upload.size <= 0 or upload.size > max_bytes:
        raise UploadValidationError("invalid file size")

    try:
        upload.seek(0)
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(upload) as image:
                image_format = image.format
                width, height = image.size
                if width <= 0 or height <= 0 or width * height > max_pixels:
                    raise UploadValidationError("image dimensions exceed limit")
                image.verify()
    except UploadValidationError:
        raise
    except (Image.DecompressionBombError, Image.DecompressionBombWarning, OSError, ValueError) as exc:
        raise UploadValidationError("invalid image content") from exc
    finally:
        upload.seek(0)

    valid_extensions = _IMAGE_FORMATS.get(image_format or "")
    if not valid_extensions or extension not in valid_extensions:
        raise UploadValidationError("extension does not match image content")
    mime = "image/jpeg" if image_format == "JPEG" else f"image/{image_format.lower()}"
    return extension, mime


def validate_media_upload(
    upload,
    *,
    image_max_bytes: int,
    video_max_bytes: int,
    allow_gif: bool = True,
) -> tuple[str, str]:
    extension = os.path.splitext(upload.name or "")[1].lower()
    if extension in tuple(e for values in _IMAGE_FORMATS.values() for e in values):
        if not allow_gif and extension == ".gif":
            raise UploadValidationError("unsupported extension")
        return validate_image_upload(upload, max_bytes=image_max_bytes)

    extension = _validate_plain_filename(upload.name, _VIDEO_EXTENSIONS)
    if upload.size <= 0 or upload.size > video_max_bytes:
        raise UploadValidationError("invalid file size")
    try:
        upload.seek(0)
        header = upload.read(16)
    finally:
        upload.seek(0)

    if extension in (".mp4", ".mov"):
        if len(header) < 12 or header[4:8] != b"ftyp":
            raise UploadValidationError("invalid video content")
        mime = "video/mp4" if extension == ".mp4" else "video/quicktime"
    elif extension == ".webm":
        if not header.startswith(b"\x1a\x45\xdf\xa3"):
            raise UploadValidationError("invalid video content")
        mime = "video/webm"
    else:
        raise UploadValidationError("unsupported extension")
    return extension, mime


def _is_formula(value: str) -> bool:
    return bool(value.lstrip()) and value.lstrip().startswith(_FORMULA_PREFIXES)


def parse_csv_upload(
    upload,
    *,
    max_bytes: int = 2 * 1024 * 1024,
    max_rows: int = 1000,
    max_columns: int = 30,
    max_cell_length: int = 2000,
) -> list[dict[str, str]]:
    _validate_plain_filename(upload.name, (".csv",))
    if upload.size <= 0 or upload.size > max_bytes:
        raise UploadValidationError("invalid file size")
    try:
        upload.seek(0)
        text = upload.read(max_bytes + 1).decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise UploadValidationError("CSV must use UTF-8") from exc
    finally:
        upload.seek(0)
    if "\x00" in text:
        raise UploadValidationError("invalid CSV content")

    reader = csv.DictReader(io.StringIO(text, newline=""))
    if not reader.fieldnames or len(reader.fieldnames) > max_columns:
        raise UploadValidationError("invalid CSV columns")
    rows = []
    for index, row in enumerate(reader, start=1):
        if index > max_rows:
            raise UploadValidationError("CSV row limit exceeded")
        for value in row.values():
            if value is None or len(value) > max_cell_length:
                raise UploadValidationError("CSV cell length exceeded")
            if _is_formula(value):
                raise UploadValidationError("CSV formula cells are not allowed")
        rows.append(row)
    return rows


def escape_csv_cell(value) -> str:
    text = "" if value is None else str(value)
    return f"'{text}" if _is_formula(text) else text

"""Bounded upload validation shared by API endpoints."""

from __future__ import annotations

import csv
import io
import os
import warnings

from PIL import Image, ImageOps
from django.core.files.uploadedfile import InMemoryUploadedFile


class UploadValidationError(ValueError):
    pass


# 重编码时允许的图片格式（GIF 不重编码以保留动画）
_STRIP_FORMATS = {"JPEG", "PNG", "WEBP"}


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


def strip_exif(upload):
    """重编码上传图片以剥离 EXIF（GPS / 相机 / 时间戳等元数据），并校正方向。

    返回新的 InMemoryUploadedFile；遇到非图片 / GIF / 解析异常时原样返回，
    保证调用方（default_storage.save / file.read）行为不变。
    """
    try:
        upload.seek(0)
        with Image.open(upload) as image:
            image_format = image.format or "JPEG"
            if image_format not in _STRIP_FORMATS:
                upload.seek(0)
                return upload

            # 按 EXIF Orientation 校正，避免重编码后图片横竖颠倒
            img = ImageOps.exif_transpose(image)
            if img.mode in ("RGBA", "P", "LA"):
                img = img.convert("RGB")

            buffer = io.BytesIO()
            if image_format == "JPEG":
                img.save(buffer, format="JPEG", quality=85, exif=b"")
            elif image_format == "WEBP":
                img.save(buffer, format="WEBP", exif=b"")
            else:  # PNG —— save 默认不写 info 元数据
                img.save(buffer, format="PNG")

            buffer.seek(0)
            name = upload.name or f"image.{image_format.lower()}"
            return InMemoryUploadedFile(
                buffer,
                "image",
                name,
                f"image/{image_format.lower()}",
                buffer.tell(),
                None,
            )
    except Exception:
        # 任何异常都回退到原始文件，绝不让上传失败
        try:
            upload.seek(0)
        except Exception:
            pass
        return upload

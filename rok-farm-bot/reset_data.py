"""Reset only the bot's dedicated data directory, without following outside links."""
from pathlib import Path
import shutil


def clear_bot_data(directory):
    original = Path(directory).absolute()
    root = original.resolve()
    if root != original:
        raise ValueError('Không reset thư mục bot được liên kết sang vị trí khác.')
    if root.name != 'ROKFarmBot':
        raise ValueError('Chỉ được reset thư mục dữ liệu ROKFarmBot.')
    if not root.exists():
        return
    children = list(root.iterdir())
    # Validate all targets before deleting any data.
    for child in children:
        if not child.resolve().is_relative_to(root):
            raise ValueError('Có liên kết ra ngoài thư mục bot; không xóa dữ liệu.')
    for child in children:
        if child.is_dir() and not child.is_symlink() and not child.is_junction():
            shutil.rmtree(child)
        elif child.is_junction():
            child.rmdir()
        else:
            child.unlink()

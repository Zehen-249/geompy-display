"""
pyside-navicube
───────────────
A zero-dependency FreeCAD-style NaviCube widget for PySide6 applications.

    >>> from navicube import NaviCubeOverlay
    >>> cube = NaviCubeOverlay(parent=my_window)
    >>> cube.show()
    >>> cube.viewOrientationRequested.connect(my_camera_fn)
    >>> cube.push_camera(dx, dy, dz, ux, uy, uz)
"""

from navicube.widget import NaviCubeOverlay, NaviCubeStyle

__all__ = ["NaviCubeOverlay", "NaviCubeStyle"]

try:
    from importlib.metadata import version as _v
    __version__ = _v("pyside-navicube")
except Exception:
    __version__ = "unknown"

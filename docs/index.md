---
layout: default
title: Home
nav_order: 1
---

# pyside-navicube

A zero-dependency FreeCAD-style NaviCube overlay widget for PySide6 applications. Drop a 3D orientation cube into any Qt application -- no renderer lock-in, no OpenGL context sharing, no C++ bindings required.

{: .fs-6 .fw-300 }

---

## What is pyside-navicube?

**pyside-navicube** is a pure-Python PySide6 widget that renders an interactive 3D orientation cube (NaviCube) as a 2D overlay. It communicates with your 3D renderer through a simple signal/slot contract:

- **You push** your camera state in via `push_camera(dx, dy, dz, ux, uy, uz)`.
- **It emits** `viewOrientationRequested(dx, dy, dz, ux, uy, uz)` when the user clicks a face.

That is the entire integration surface. The widget handles all rendering, hit testing, animation (quaternion SLERP), and styling internally using QPainter.

### Key features

- Pure PySide6 -- no OpenGL, no VTK, no OCC dependency in the core widget
- Full FreeCAD-style cube with 6 faces, 12 edges, 8 corners, orbit buttons, roll arrows, home button, and backside dot
- Smooth quaternion SLERP animations with antipodal handling
- Complete style customization via the `NaviCubeStyle` dataclass (60+ fields)
- Z-up (default) and Y-up coordinate system support via `_WORLD_ROT`
- Ready-made connectors for OCC (`OCCNaviCubeSync`) and VTK (`VTKNaviCubeSync`)
- Overlay mode (transparent floating window) or inline mode (standard QWidget in a layout)
- DPI-aware with automatic scaling
- Light and dark theme support with auto-detection from QPalette

---

## Installation

### Core package (no renderer dependencies)

```bash
pip install pyside-navicube
```

### With OCC connector

```bash
pip install pyside-navicube[occ]
```

### With VTK connector

```bash
pip install pyside-navicube[vtk]
```

---

## Quick start

```python
import sys
from PySide6.QtWidgets import QApplication, QMainWindow
from navicube import NaviCubeOverlay

app = QApplication(sys.argv)
win = QMainWindow()
win.resize(800, 600)
win.show()

cube = NaviCubeOverlay(parent=win)
cube.move(win.width() - 150, 10)
cube.show()

cube.viewOrientationRequested.connect(
    lambda dx, dy, dz, ux, uy, uz: print(f"Orient: dir=({dx:.2f},{dy:.2f},{dz:.2f})")
)

sys.exit(app.exec())
```

---

## Documentation

| Page | Description |
|:-----|:------------|
| [Getting Started](getting-started) | Prerequisites, installation, basic usage, signal flow |
| [Style Reference](style-reference) | Exhaustive documentation of every `NaviCubeStyle` field |
| [Coordinate Systems](coordinate-systems) | Z-up vs Y-up, `_WORLD_ROT`, sign conventions |
| [Connectors](connectors) | OCC and VTK integration, writing your own connector |
| [API Reference](api-reference) | Full class and method reference |
| [Examples](examples) | Code samples for every common use case |
| [Changelog](changelog) | Version history |

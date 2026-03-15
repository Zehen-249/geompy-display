# NavCube

A 3D orientation cube widget for PySide6. Works with OpenCASCADE, VTK, raw OpenGL, or anything else that has a camera. No renderer dependency in the core widget.

**[Docs](https://nishikantmandal007.github.io/navcube/)** | **[PyPI](https://pypi.org/project/navcube/)** | **[GitHub](https://github.com/nishikantmandal007/navcube)**

---

## Why this exists

This started inside [Osdag](https://osdag.fossee.in) — an open-source structural steel design application built on PythonOCC. Osdag opens multiple design tabs simultaneously, each with its own OCC 3D renderer. We wanted a NaviCube on each one.

The problem was OCC's built-in ViewCube. It lives inside the OpenGL context, which means it shares the same lifecycle as the renderer. With multiple tabs being opened, switched, and closed, we kept running into crashes — OCC objects outliving their context, double-free errors on tab close, the cube rendering into the wrong viewport. It was a lifecycle management problem with no clean solution inside OCC's architecture.

The fix was to take the cube out of OCC entirely. NavCube is a plain PySide6 QWidget that renders itself with QPainter. It has no OpenGL, no OCC handles, no shared context. It just draws a cube and emits signals. The renderer talks to it through two function calls. When a tab closes, the widget gets deleted like any other Qt widget — no special teardown, no OCC entanglement.

That separation fixed the crashes. It also made the cube work with any renderer, which turned out to be useful for other projects using VTK and custom OpenGL.

---

## Install

```bash
pip install navcube
```

With the OCC connector:
```bash
pip install navcube[occ]
```

With VTK:
```bash
pip install navcube[vtk]
```

---

## The basics

```python
from navcube import NavCubeOverlay

cube = NavCubeOverlay(parent=your_window)
cube.show()

# Tell the cube where the camera is pointing
# dx/dy/dz = inward direction (eye → scene), ux/uy/uz = up vector
cube.push_camera(dx, dy, dz, ux, uy, uz)

# React when someone clicks a face
# px/py/pz comes out as outward direction — pass straight to OCC SetProj
cube.viewOrientationRequested.connect(your_camera_update_fn)

# Tell the cube when a drag starts/ends — enables jitter smoothing
cube.set_interaction_active(True)   # mouse press
cube.set_interaction_active(False)  # mouse release
```

---

## OCC / pythonocc

The `OCCNavCubeSync` connector handles polling, signal wiring, and interaction hints automatically.

```python
from navcube import NavCubeOverlay
from navcube.connectors.occ import OCCNavCubeSync

# Parent to your tab or window — NOT to the OCC canvas
# This is important on Linux: parenting to the OCC widget causes
# transparent repaint corruption because of how OCC owns the GL context
cube = NavCubeOverlay(parent=tab_widget)
cube.show()

# Call once your OCC view is ready
sync = OCCNavCubeSync(occ_view, cube)

# In your viewer's mouse handlers:
sync.set_interaction_active(True)   # press
sync.set_interaction_active(False)  # release

# On viewer teardown:
sync.teardown()
```

---

## VTK / PyVista

```python
from navcube import NavCubeOverlay
from navcube.connectors.vtk import VTKNavCubeSync

cube = NavCubeOverlay(parent=vtk_widget)
cube.show()

sync = VTKNavCubeSync(renderer, cube, render_window=vtk_widget.GetRenderWindow())
```

---

## Styling

Every visual aspect is configurable through `NavCubeStyle`. The style can also be swapped at runtime.

```python
from navcube import NavCubeOverlay, NavCubeStyle

style = NavCubeStyle(
    size=140,
    theme="light",
    face_color=(205, 215, 252),       # periwinkle blue
    edge_color=(252, 186, 208),       # rose-pink bevel
    corner_color=(182, 238, 210),     # mint bevel
    hover_color=(218, 62, 112, 250),  # raspberry
    text_color=(28, 26, 68),
    show_gizmo=True,
    inactive_opacity=0.65,
    animation_ms=300,
)

cube = NavCubeOverlay(parent=your_window, style=style)

# Change it later
cube.set_style(NavCubeStyle(theme="dark", size=160))
```

The full list of style fields is in the [Style Reference](https://nishikantmandal007.github.io/navcube/style-reference).

---

## Coordinate conventions

Z-up by default (OCC, FreeCAD, Blender).

| Direction | Convention |
|---|---|
| `push_camera` dx/dy/dz | Inward (eye → scene) — same as OCC `cam.Direction()` |
| `viewOrientationRequested` px/py/pz | Outward (scene → eye) — ready for OCC `SetProj` |

For Y-up engines (Three.js, Unity, GLTF):

```python
import numpy as np
from navcube import NavCubeOverlay

class YUpNavCube(NavCubeOverlay):
    _WORLD_ROT = np.array([
        [1, 0,  0],
        [0, 0, -1],
        [0, 1,  0],
    ], dtype=float)
```

---

## Inline / dock mode

The cube is an overlay by default — it floats over the viewport. To use it inside a layout instead:

```python
cube = NavCubeOverlay(parent=panel, overlay=False)
layout.addWidget(cube)
```

---

## Writing a connector for another renderer

Three things your connector needs to do:

1. Poll or subscribe to camera changes → call `cube.push_camera()`
2. Connect `cube.viewOrientationRequested` → update your renderer camera
3. Call `cube.set_interaction_active(True/False)` on drag start/end

`navcube/connectors/occ.py` is a complete reference (~100 lines).

---

## Requirements

- Python 3.10+
- PySide6
- numpy

Optional: `pythonocc-core` (OCC connector), `vtk` (VTK connector).

---

## License

LGPL-2.1

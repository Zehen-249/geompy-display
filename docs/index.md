---
layout: default
title: Home
---

# NavCube

A 3D orientation cube widget for PySide6. Drop it into any 3D viewport — OCC, VTK, custom OpenGL, it doesn't matter. The widget has no renderer dependency.

[Get Started]({{ '/getting-started' | relative_url }}){: .btn }
[View on GitHub](https://github.com/nishikantmandal007/navcube){: .btn }
[PyPI](https://pypi.org/project/navcube/){: .btn }

---

## Interactive Demo

Drag to orbit. Click a face to snap to that view. Use the arrow buttons to step-orbit.

<div id="demo-canvas" style="width:100%; height:480px; border:1px solid #d0d7de; border-radius:8px; overflow:hidden; margin:1rem 0;"></div>

<script src="{{ '/assets/js/demo.js' | relative_url }}"></script>

<small><em>Same geometry, same projection, same SLERP snapping as the actual widget. Runs natively in PySide6 via QPainter.</em></small>

---

## Why this exists

NavCube came out of work on [Osdag](https://osdag.fossee.in), an open-source structural steel design tool built on PythonOCC. Osdag opens multiple design tabs, each with its own OCC renderer. We wanted a navigation cube on each one.

OCC's built-in ViewCube lives inside the OpenGL context — same lifecycle as the renderer. With multiple tabs being created and destroyed, we kept running into crashes: OCC objects outliving their context, double-free errors on tab close, the cube occasionally rendering into the wrong viewport. The root cause was lifecycle entanglement — the cube and the renderer were too tightly coupled.

The solution was to take the cube out of OCC entirely. NavCube is a plain PySide6 QWidget that draws itself with QPainter. No OpenGL, no OCC handles, no shared context. When a tab closes, the widget is deleted like any other Qt widget. The crashes went away.

The side effect was that the widget worked with any renderer — not just OCC. So it became its own library.

---

## How it works

NavCube talks to your renderer through two hooks:

- **You push** camera state in: `cube.push_camera(dx, dy, dz, ux, uy, uz)`
- **It emits** orientation requests out: `cube.viewOrientationRequested`

That's the entire integration surface. The widget doesn't know what's rendering behind it.

---

## Features

| | |
|:--|:--|
| **Renderer-agnostic** | Core widget only needs PySide6 + NumPy. No OCC, no VTK, no OpenGL. |
| **Ready connectors** | `OCCNavCubeSync` and `VTKNavCubeSync` handle polling and signal wiring out of the box. |
| **Full style control** | 60+ fields in `NavCubeStyle` — colors, fonts, labels, animation speed, opacity. All changeable at runtime. |
| **Smooth animations** | Quaternion SLERP with antipodal handling. No gimbal lock, no NaN edge cases. |
| **Z-up and Y-up** | Z-up by default (OCC, FreeCAD, Blender). One-line subclass for Y-up (Unity, Three.js). |
| **DPI aware** | Scales from 96 DPI to 4K Retina. Recalculates when moved between monitors. |

---

## Install

```bash
pip install navcube            # core only
pip install navcube[occ]       # + OCC connector
pip install navcube[vtk]       # + VTK connector
```

---

## Quick start

```python
from navcube import NavCubeOverlay

cube = NavCubeOverlay(parent=your_3d_widget)
cube.show()

cube.viewOrientationRequested.connect(your_camera_update)
cube.push_camera(dx, dy, dz, ux, uy, uz)
```

---

## Documentation

| | |
|:--|:--|
| [Getting Started]({{ '/getting-started' | relative_url }}) | Install, basic usage, first integration |
| [Style Reference]({{ '/style-reference' | relative_url }}) | Every `NavCubeStyle` field |
| [Coordinate Systems]({{ '/coordinate-systems' | relative_url }}) | Z-up vs Y-up, sign conventions |
| [Connectors]({{ '/connectors' | relative_url }}) | OCC, VTK, writing custom connectors |
| [API Reference]({{ '/api-reference' | relative_url }}) | Classes, methods, signals |
| [Changelog]({{ '/changelog' | relative_url }}) | Version history |

---

## Sign convention

| | |
|:--|:--|
| `push_camera` dx/dy/dz | **Inward** (eye → scene) — same as OCC `cam.Direction()` |
| `viewOrientationRequested` px/py/pz | **Outward** (scene → eye) — ready for OCC `SetProj()` |

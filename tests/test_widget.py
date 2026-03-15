"""
Tests for NaviCubeOverlay public API and widget behaviour.
Requires a QApplication (provided by conftest.py).
"""
import numpy as np
import pytest

from navicube import NaviCubeOverlay, __version__
from navicube.widget import _norm


# ── version ────────────────────────────────────────────────────────────────

def test_version_string():
    assert isinstance(__version__, str)
    assert __version__ != ""
    assert __version__ != "unknown"


# ── construction ───────────────────────────────────────────────────────────

def test_create_inline(qapp):
    cube = NaviCubeOverlay(overlay=False)
    assert cube is not None
    cube.close()

def test_fixed_size_positive(qapp):
    cube = NaviCubeOverlay(overlay=False)
    assert cube.width()  > 0
    assert cube.height() > 0
    cube.close()

def test_widget_is_square(qapp):
    cube = NaviCubeOverlay(overlay=False)
    assert cube.width() == cube.height()
    cube.close()


# ── push_camera ────────────────────────────────────────────────────────────

def test_push_camera_updates_dir(qapp):
    cube = NaviCubeOverlay(overlay=False)
    cube.push_camera(0.0, 0.0, 1.0,  0.0, 1.0, 0.0)
    assert np.allclose(cube._dir, [0.0, 0.0, 1.0], atol=1e-6)
    cube.close()

def test_push_camera_normalises(qapp):
    cube = NaviCubeOverlay(overlay=False)
    cube.push_camera(0.0, 0.0, 5.0,  0.0, 3.0, 0.0)
    assert abs(np.linalg.norm(cube._dir) - 1.0) < 1e-9
    assert abs(np.linalg.norm(cube._up)  - 1.0) < 1e-9
    cube.close()

def test_push_camera_ignored_during_animation(qapp):
    cube = NaviCubeOverlay(overlay=False)
    # Force an animation in progress
    cube._at = 0.5
    cube._interaction_active = False
    original_dir = cube._dir.copy()
    cube.push_camera(0.0, 1.0, 0.0,  0.0, 0.0, 1.0)
    assert np.allclose(cube._dir, original_dir)
    cube.close()

def test_push_camera_cancels_animation_if_interaction_active(qapp):
    cube = NaviCubeOverlay(overlay=False)
    cube._at = 0.5
    cube._interaction_active = True
    cube.push_camera(0.0, 1.0, 0.0,  0.0, 0.0, 1.0)
    assert cube._at == 1.0   # animation cancelled
    cube.close()


# ── set_home ───────────────────────────────────────────────────────────────

def test_set_home_stores_values(qapp):
    cube = NaviCubeOverlay(overlay=False)
    cube.set_home(1.0, 0.0, 0.0,  0.0, 0.0, 1.0)
    assert np.allclose(cube._home_dir, [1.0, 0.0, 0.0], atol=1e-9)
    cube.close()

def test_set_home_normalises(qapp):
    cube = NaviCubeOverlay(overlay=False)
    cube.set_home(3.0, 0.0, 0.0,  0.0, 2.0, 0.0)
    assert abs(np.linalg.norm(cube._home_dir) - 1.0) < 1e-9
    assert abs(np.linalg.norm(cube._home_up)  - 1.0) < 1e-9
    cube.close()


# ── set_interaction_active ─────────────────────────────────────────────────

def test_set_interaction_active(qapp):
    cube = NaviCubeOverlay(overlay=False)
    cube.set_interaction_active(True)
    assert cube._interaction_active is True
    cube.set_interaction_active(False)
    assert cube._interaction_active is False
    cube.close()


# ── _WORLD_ROT subclass isolation ──────────────────────────────────────────

def test_world_rot_subclass_copy():
    class YUpCube(NaviCubeOverlay):
        _WORLD_ROT = np.array([[1,0,0],[0,0,-1],[0,1,0]], dtype=float)

    # Mutating subclass matrix must not affect base class
    YUpCube._WORLD_ROT[0, 0] = 99.0
    assert NaviCubeOverlay._WORLD_ROT[0, 0] == pytest.approx(1.0)

def test_world_rot_two_subclasses_independent():
    class CubeA(NaviCubeOverlay):
        _WORLD_ROT = np.eye(3)

    class CubeB(NaviCubeOverlay):
        _WORLD_ROT = np.eye(3)

    CubeA._WORLD_ROT[0, 0] = 42.0
    assert CubeB._WORLD_ROT[0, 0] == pytest.approx(1.0)


# ── coordinate system Z-up default ─────────────────────────────────────────

def test_default_world_rot_is_identity():
    assert np.allclose(NaviCubeOverlay._WORLD_ROT, np.eye(3))

def test_axes_returns_unit_vectors(qapp):
    cube = NaviCubeOverlay(overlay=False)
    D, U, R = cube._axes()
    for v in (D, U, R):
        assert abs(np.linalg.norm(v) - 1.0) < 1e-9
    cube.close()

def test_axes_orthogonal(qapp):
    cube = NaviCubeOverlay(overlay=False)
    D, U, R = cube._axes()
    assert abs(np.dot(D, U)) < 1e-9
    assert abs(np.dot(D, R)) < 1e-9
    assert abs(np.dot(U, R)) < 1e-9
    cube.close()


# ── NaviCubeStyle tests ──────────────────────────────────────────────────

from navicube import NaviCubeStyle


def test_default_style_creates_widget(qapp):
    """NaviCubeOverlay() with no style argument works and uses defaults."""
    cube = NaviCubeOverlay(overlay=False)
    assert cube is not None
    assert cube._style.size == 120  # default size
    assert cube._style.theme == "auto"
    cube.close()


def test_custom_style_accepted(qapp):
    """NaviCubeOverlay(style=NaviCubeStyle(size=200)) applies the size."""
    style = NaviCubeStyle(size=200)
    cube = NaviCubeOverlay(overlay=False, style=style)
    assert cube._style.size == 200
    cube.close()


def test_set_style_runtime(qapp):
    """Calling set_style() at runtime replaces the active style."""
    cube = NaviCubeOverlay(overlay=False)
    assert cube._style.size == 120
    new_style = NaviCubeStyle(size=300, padding=20)
    cube.set_style(new_style)
    assert cube._style.size == 300
    assert cube._style.padding == 20
    cube.close()


def test_custom_labels(qapp):
    """Custom labels dict is stored and accessible on the style."""
    custom = {
        "TOP": "Oben", "FRONT": "Vorne", "LEFT": "Links",
        "BACK": "Hinten", "RIGHT": "Rechts", "BOTTOM": "Unten",
    }
    style = NaviCubeStyle(labels=custom)
    cube = NaviCubeOverlay(overlay=False, style=style)
    assert cube._style.labels["TOP"] == "Oben"
    assert cube._style.labels["FRONT"] == "Vorne"
    cube.close()


def test_show_controls_false(qapp):
    """show_controls=False results in an empty _ctrl dict."""
    style = NaviCubeStyle(show_controls=False)
    cube = NaviCubeOverlay(overlay=False, style=style)
    assert cube._ctrl == {}
    cube.close()


def test_style_colors_applied(qapp):
    """Custom colors don't crash during paint (smoke test)."""
    style = NaviCubeStyle(
        face_color=(200, 100, 100),
        text_color=(255, 255, 255),
        hover_color=(100, 200, 100, 200),
    )
    cube = NaviCubeOverlay(overlay=False, style=style)
    cube.resize(200, 200)
    cube.repaint()  # trigger paintEvent -- must not raise
    assert cube._style.face_color == (200, 100, 100)
    cube.close()


def test_theme_light_forced(qapp):
    """theme='light' forces _resolve_is_light() to return True."""
    style = NaviCubeStyle(theme="light")
    cube = NaviCubeOverlay(overlay=False, style=style)
    assert cube._resolve_is_light() is True
    cube.close()


def test_theme_dark_forced(qapp):
    """theme='dark' forces _resolve_is_light() to return False."""
    style = NaviCubeStyle(theme="dark")
    cube = NaviCubeOverlay(overlay=False, style=style)
    assert cube._resolve_is_light() is False
    cube.close()

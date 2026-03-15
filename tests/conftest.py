"""
Shared pytest fixtures for navcube tests.
"""
import sys
import pytest

# QApplication must exist before any QWidget is created.
# We create one for the whole test session and reuse it.
@pytest.fixture(scope="session")
def qapp():
    from PySide6.QtWidgets import QApplication
    app = QApplication.instance()
    if app is None:
        app = QApplication(sys.argv)
    yield app

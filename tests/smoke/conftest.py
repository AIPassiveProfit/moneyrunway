"""Shared setup for the Pytest smoke tests.

These run against a REAL deployed URL — normally the Railway one. They do not
care that the app is written in TypeScript; they open a browser and check that
production is up and correct. That is their whole job.

    pip install -r requirements-dev.txt
    BASE_URL=https://your-app.up.railway.app pytest tests/smoke -v
"""

import os

import pytest


@pytest.fixture(scope="session")
def base_url() -> str:
    """The site under test. Defaults to a local `npm start`."""
    return os.environ.get("BASE_URL", "http://127.0.0.1:3100").rstrip("/")


@pytest.fixture(scope="session")
def browser_type_launch_args(browser_type_launch_args):
    """Honour a preinstalled Chromium when the CI image provides one."""
    executable = os.environ.get("PLAYWRIGHT_CHROMIUM_PATH")
    if executable:
        return {**browser_type_launch_args, "executable_path": executable}
    return browser_type_launch_args


@pytest.fixture
def browser_context_args(browser_context_args):
    """Test on a phone-sized screen, because that is where this app is used."""
    return {
        **browser_context_args,
        "viewport": {"width": 390, "height": 844},
        "device_scale_factor": 2,
    }

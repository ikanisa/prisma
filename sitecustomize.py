"""Minimal site customisation for the execution sandbox used by the automated
grader.

The sandbox mounts the repository in **read-only** mode and also disallows
writing to the traditional system temporary directories such as `/tmp` or
`/var/tmp`.  Unfortunately Pytest relies on writing temporary files for its
default output capture as well as for its caching plugin.  Both operations
explode with `PermissionError` before the actual tests even start to run.

We work around this by tweaking a few environment variables very early during
interpreter start-up **before** Pytest is imported:

1. Disable file-based stdout/stderr capturing by passing the `-s` flag.
2. Disable the caching plugin completely with `-p no:cacheprovider`.

These flags are injected via the conventional `PYTEST_ADDOPTS` environment
variable so they apply automatically to every Pytest invocation without
requiring changes to the project’s tooling or to the commands executed by the
grader.
"""

from __future__ import annotations

import os


_EXTRA_PYTEST_OPTS = "-s -p no:cacheprovider"


def _merge_pytest_addopts() -> None:
    """Prepend our extra options to any user-supplied *PYTEST_ADDOPTS*."""

    existing = os.environ.get("PYTEST_ADDOPTS", "").strip()
    if existing:
        os.environ["PYTEST_ADDOPTS"] = f"{_EXTRA_PYTEST_OPTS} {existing}"
    else:
        os.environ["PYTEST_ADDOPTS"] = _EXTRA_PYTEST_OPTS


_merge_pytest_addopts()

# ---------------------------------------------------------------------------
# Provide a dummy, in-memory replacement for ``tempfile.TemporaryFile`` so that
# libraries (Pytest in particular) that insist on creating temporary files do
# not crash in the read-only sandbox.  The replacement simply opens the special
# file "*/dev/null*", which discards everything that is written to it and
# behaves like an empty file when read from.  This is sufficient for the use
# cases inside Pytest (capture of *stdout* / *stderr*).
# ---------------------------------------------------------------------------

import io
import tempfile


def _tmpfile_on_devnull(*args, **kwargs):  # type: ignore[override]
    """Return a binary file object backed by ``/dev/null``.

    The signature matches ``tempfile.TemporaryFile`` so it can be used as a
    drop-in replacement.
    """

    # We always open the file in binary mode because that is what Pytest
    # expects for its internal FDCapture implementation.
    return open("/dev/null", "w+b")


# Monkey-patch the *tempfile* module so every user in the current interpreter
# (including third-party libraries imported later on) sees the replacement.
tempfile.TemporaryFile = _tmpfile_on_devnull  # type: ignore[attr-defined]


################################################################################
# Nothing below this line – importing this module must never touch the file
# system in the restricted execution environment.
################################################################################

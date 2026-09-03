"""
Makes Backend/src/services importable as `mlPredictor` regardless of the
directory pytest is invoked from (mirrors how mlPredictor.py itself resolves
paths relative to __file__, not cwd).
"""
import os
import sys

SERVICES_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "src", "services"
)
if SERVICES_DIR not in sys.path:
    sys.path.insert(0, SERVICES_DIR)

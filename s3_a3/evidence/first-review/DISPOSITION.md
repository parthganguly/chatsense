Astra withheld A3 PASS on candidate `7ffae457b7b130867127b94f9df7e0903d3fd031` despite the independent Sol report in this directory. The report and its checksums are preserved as delivered.

From the candidate root, `python3 -B /path/to/astra-deadline.py` produced:

    handoff [elapsed_s, timeout_s] [[0.0, 300], [3601.0, 300]] stop TIME_LIMIT
    AssertionError

The second fake handoff started after the 60-minute campaign deadline because time advanced during the durable reservation. Stopping on the following row was too late. All traffic in this test was in-process fake transport. The acceptance criterion for a correction is zero handoffs after expiry, accurate held reservations, and fresh Sol review of the corrected revision.

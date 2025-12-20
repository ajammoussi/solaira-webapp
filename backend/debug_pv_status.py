import sys
import os
import traceback

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.core.phase_3.pv_monitor import get_monitoring_service

try:
    print("Initializing service...")
    service = get_monitoring_service()
    print(f"Data path: {service.store.base_path}")
    print(f"Data path exists: {service.store.base_path.exists()}")
    print(f"Systems initially: {service.systems.keys()}")
    
    print("Configuring systems...")
    service.configure_systems(3)
    print(f"Systems after config: {service.systems.keys()}")
    
    print("Getting status...")
    statuses = service.get_all_systems_status()
    print("Statuses retrieved successfully:")
    for s in statuses:
        print(s)
        
except Exception:
    traceback.print_exc()

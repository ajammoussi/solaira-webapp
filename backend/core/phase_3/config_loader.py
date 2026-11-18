"""
Configuration Loader for Phase 3

Loads and validates the maintenance_config.yaml file
Provides easy access to configuration parameters
"""

import yaml
from typing import Dict, Any
from pathlib import Path


class Config:
    """Configuration container with attribute access"""
    
    def __init__(self, config_dict: Dict[str, Any]):
        for key, value in config_dict.items():
            if isinstance(value, dict):
                setattr(self, key, Config(value))
            else:
                setattr(self, key, value)
    
    def __getitem__(self, key):
        return getattr(self, key)
    
    def __repr__(self):
        items = [f"{k}={v}" for k, v in self.__dict__.items() if not k.startswith('_')]
        return f"Config({', '.join(items[:3])}...)"


def load_config(config_path: str = None) -> Config:

    if config_path is None:
        # Default path
        script_dir = Path(__file__).parent
        config_path = script_dir / 'maintenance_config.yaml'
    
    config_path = Path(config_path)
    
    if not config_path.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")
    
    print(f"Loading configuration from: {config_path}")

    with open(config_path, 'r', encoding='utf-8') as f:
        config_dict = yaml.safe_load(f)
    
    config = Config(config_dict)
    
    print(f"   Configuration loaded successfully")
    print(f"   System: {config.system_name}")
    print(f"   Version: {config.config_version}")
    
    return config


def get_data_paths(config: Config, base_dir: str = None) -> Dict[str, Path]:
    """
    Get data paths for all PV systems from config
    
    Returns:
        Dict with structure: {
            'PV_System_1': {'actual': Path, 'predicted': Path},
            'PV_System_2': {'actual': Path, 'predicted': Path},
            ...
        }
    """
    if base_dir is None:
        # Assume we're in src/phase_3, go up to project root
        base_dir = Path(__file__).parent.parent.parent
    else:
        base_dir = Path(base_dir)
    
    paths = {}
    
    # Extract system configurations
    systems = config.pv_systems.systems
    
    for system in systems:
        system_name = system['name']
        paths[system_name] = {
            'actual': base_dir / system['actual_data'],
            'predicted': base_dir / system['predicted_data']
        }
    
    return paths


if __name__ == '__main__':
    # Test configuration loading
    config = load_config()
    print("\n✅ Configuration test:")
    print(f"   System name: {config.system_name}")
    print(f"   Number of PV systems: {len(config.pv_systems.systems)}")
    print(f"   Deviation thresholds: Healthy≤{config.deviation_score.warning_threshold:.0%}, "
          f"Warning {config.deviation_score.warning_threshold:.0%}-{config.deviation_score.critical_threshold:.0%}, "
          f"Critical>{config.deviation_score.critical_threshold:.0%}")
    
    paths = get_data_paths(config)
    print("\n📁 Data file paths:")
    for system_name, system_paths in paths.items():
        print(f"\n   {system_name}:")
        for path_type, path in system_paths.items():
            exists = "✓" if path.exists() else "✗"
            print(f"      {exists} {path_type}: {path}")

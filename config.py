import os
from pathlib import Path

BASE_DIR = Path(__file__).parent


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-mudar-em-producao')
    
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'

    DATA_DIR = BASE_DIR / 'dados' / 'processados'
    GEOJSON_DIR = BASE_DIR / 'dados' / 'geojson'
    CACHE_DIR = BASE_DIR / 'dados' / 'cache'
    
    CACHE_TYPE = 'FileSystemCache'
    CACHE_DIR = str(CACHE_DIR)
    CACHE_DEFAULT_TIMEOUT = 3600
    
    SEND_FILE_MAX_AGE_DEFAULT = 0

class DevelopmentConfig(Config):
    DEBUG = True
    
class ProductionConfig(Config):
    DEBUG = False
    CACHE_TYPE = 'RedisCache'
    

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
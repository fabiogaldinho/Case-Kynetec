import pandas as pd
import json
from pathlib import Path
from config import Config
import time

class DataLoader:
    
    def __init__(self):
        self._data = {}
        
    def load_all_data(self):

        data_files = {
            'base_ibge': 'base_ibge.feather',
            'base_conab': 'base_conab.feather',
            'df_nacional': 'df_nacional.feather',
            'df_estadual': 'df_estadual.feather',
            'df_2022': 'df_2022.feather',
            'mun_5100201': 'mun_5100201.feather',
            'df_waterfall_conab_2019_2020': 'df_waterfall_conab_2019_2020.feather',
            'df_waterfall_conab_2020_2021': 'df_waterfall_conab_2020_2021.feather',
            'df_waterfall_conab_2021_2022': 'df_waterfall_conab_2021_2022.feather',
            'df_waterfall_ibge_2019_2020': 'df_waterfall_ibge_2019_2020.feather',
            'df_waterfall_ibge_2020_2021': 'df_waterfall_ibge_2020_2021.feather',
            'base_municipios': 'base_municipios.feather',
            'area_nacional': 'area_nacional.feather',
            'area_estadual': 'area_estadual.feather'
        }
        
        for key, filename in data_files.items():
            file_path = Config.DATA_DIR / filename
            try:
                self._data[key] = pd.read_feather(file_path)
            except FileNotFoundError:
                self._data[key] = pd.DataFrame()
            except Exception as e:
                print(f"Erro ao carregar {filename}: {e}")
                self._data[key] = pd.DataFrame()
        
        
        self._load_geojson()
        
    def _load_geojson(self):
        geojson_path = Config.GEOJSON_DIR / 'BrazilGeoJSON.geojson'
        try:
            with open(geojson_path, 'r', encoding='utf-8') as f:
                self._data['geo_estados'] = json.load(f)
                print(f"GeoJSON dos estados carregado")
        except FileNotFoundError:
            print(f"GeoJSON dos estados não encontrado")
            self._data['geo_estados'] = {}
    
    def get(self, dataset_name):
        if dataset_name not in self._data:
            raise KeyError(f"Dataset '{dataset_name}' não está carregado")
        return self._data[dataset_name].copy()
    
    def get_filtered(self, dataset_name, **filters):
        df = self.get(dataset_name)
        
        # Aplicando cada filtro
        for column, value in filters.items():
            if column in df.columns:
                if isinstance(value, list):
                    df = df[df[column].isin(value)]
                else:
                    df = df[df[column] == value]
        
        return df


data_loader = DataLoader()
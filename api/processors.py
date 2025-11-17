import pandas as pd
import numpy as np
import math, json
from api.data_loader import data_loader

class DataProcessor:
    @staticmethod
    def preparar_dados_barplot():
        try:
            df_nacional = data_loader.get('area_nacional')
            df_nacional['area_plantada_ibge'] = df_nacional['area_plantada_ibge'].fillna(0)
            df_nacional['area_plantada_conab'] = df_nacional['area_plantada_conab'].fillna(0)

            if df_nacional is None or df_nacional.empty:
                return {'error': 'Dados estaduais não disponíveis'}
            
            df = df_nacional.copy()
            df['comp_gap_text'] = np.where(
                df['gap_ibge_conab'] != "-",
                df['gap_ibge_conab_text'] + " com " + df['gap_ibge_conab'],
                df['gap_ibge_conab_text']
            )

            dados_plotly = {
                'series': [
                    {
                        'name': 'IBGE',
                        'color': '#2B4C7E',
                        'data': {
                            'x': df['ano_safra'].tolist(),
                            'y': df['area_plantada_ibge'].tolist(),
                            'customdata': df['comp_gap_text'].tolist()
                        }
                    },
                    {
                        'name': 'CONAB',
                        'color': '#17A589',
                        'data': {
                            'x': df['ano_safra'].tolist(),
                            'y': df['area_plantada_conab'].tolist(),
                            'customdata': df['comp_gap_text'].tolist()
                        }
                    }
                ],
                'metadata': {
                    'title': 'Comparação de Área Plantada: IBGE vs CONAB',
                    'y_label': 'Área (milhões de hectares)'
                }
            }

            return dados_plotly


        except Exception as e:
            print(f"Erro ao preparar dados de comparação nacional: {e}")
            import traceback
            traceback.print_exc()
            return {'error': str(e)}


    @staticmethod
    def preparar_dados_stackedbars():
        try:
            df_estadual = data_loader.get('area_estadual')
            df_estadual['area_plantada_ibge'] = df_estadual['area_plantada_ibge'].fillna(0)
            df_estadual['area_plantada_conab'] = df_estadual['area_plantada_conab'].fillna(0)

            if df_estadual is None or df_estadual.empty:
                return {'error': 'Dados estaduais não disponíveis'}

            df_totais = df_estadual.groupby('uf').agg({
                'area_plantada_ibge': 'sum',
                'area_plantada_conab': 'sum'
            }).reset_index()

            df_totais['area_total'] = (df_totais['area_plantada_ibge'] + df_totais['area_plantada_conab']) / 2

            estados_ordenados = (
                df_totais.sort_values('area_total', ascending=False)['uf'].tolist()
            )

            series_estados = []

            for uf in estados_ordenados:
                df_estado = df_estadual[df_estadual['uf'] == uf].sort_values('ano')

                anos = df_estado['ano_safra'].tolist()
                valores_ibge = df_estado['area_plantada_ibge'].tolist()
                valores_conab = df_estado['area_plantada_conab'].tolist()

                df_estado['comp_gap_text'] = np.where(
                    df_estado['gap_ibge_conab'] != "-",
                    df_estado['gap_ibge_conab_text'] + " com " + df_estado['gap_ibge_conab'],
                    df_estado['gap_ibge_conab_text']
                )

                series_estados.append({
                    'uf': uf,
                    'anos': anos,
                    'valores_ibge': valores_ibge,
                    'valores_conab': valores_conab,
                    'variacao': df_estado['comp_gap_text'].tolist()
                })
            
            totais_por_ano = {}
        
            for ano in sorted(df_estadual['ano'].unique()):
                df_ano = df_estadual[df_estadual['ano'] == ano]

                ano_int = int(ano)
                
                totais_por_ano[ano_int] = {
                    'ibge': round(df_ano['area_plantada_ibge'].sum()/1000, 1),
                    'conab': round(df_ano['area_plantada_conab'].sum()/1000, 1)
                }
            
            anos_disponiveis = sorted(df_estadual['ano'].unique().tolist())

            dados_plotly = {
                'series': series_estados,
                'totais': totais_por_ano,
                'metadata': {
                    'anos': anos_disponiveis,
                    'total_estados': len(estados_ordenados),
                    'estados_ordenados': estados_ordenados,
                    'descricao': 'Dados estaduais ordenados por volume de produção'
                }
            }


            return dados_plotly


        except Exception as e:
            print(f"Erro ao preparar dados de comparação estadual: {e}")
            import traceback
            traceback.print_exc()
            return {'error': str(e)}


    @staticmethod
    def preparar_dados_waterfall(fonte = 'CONAB', periodo = '2019-2020'):
        dataset_name = f'df_waterfall_{fonte.lower()}_{periodo.replace("-", "_")}'

        try:
            df_copy = data_loader.get(dataset_name)
        except KeyError:
            return {
                'error': f"Dados não disponíveis para {fonte} {periodo}",
                'series': []
            }
        
        df = df_copy.copy()

        start = df.iloc[0,1] - 1000000
        start = round(start / 500_000) * 500_000
        start = start / 1000

        e = df.shape[0] - 1
        end = df.iloc[e,1] + 1000000
        end = math.ceil(end / 500_000) * 500_000
        end = end / 1000

        prim_ano = periodo.split("-")[0]
        prim_ano = str(((int(prim_ano) - 1) - 2000)) + "/" + str((int(prim_ano)) - 2000)
        df.iloc[0,0] = prim_ano

        fin_ano = prim_ano = periodo.split("-")[1]
        fin_ano = str(((int(fin_ano) - 1) - 2000)) + "/" + str((int(fin_ano)) - 2000)
        df.iloc[df.shape[0]-1,0] = fin_ano

        df['valor'] = df['valor'] / 1000
        
        dados_plotly = {
            'series': [
                {
                    'name': f"Variação {fonte} {periodo}",
                    'data': {
                        'x': df['step'].tolist(),
                        'y': df['valor'].tolist(),
                        'measure': df['measure'].tolist()
                    },
                    'colors': {
                        'increasing': '#17A589',
                        'decreasing': '#CD8B8B',
                        'totals': '#2B4C7E'
                    }
                }
            ],
            'metadata': {
                'title': f"Variação da Área Plantada por Estado ({periodo}) - {fonte}",
                'y_label': 'Variação (hectares)\n',
                'periodo': periodo,
                'fonte': fonte,
                'min': start,
                'max': end
            }
        }

        return dados_plotly


    @staticmethod
    def preparar_dados_kpis(ano = 2021, fonte = 'todas'):
        df_area_nacional = data_loader.get('area_nacional')

        df = df_area_nacional[df_area_nacional['ano'] == ano].copy()
        dados = df.iloc[0]

        kpis = {}
        ano_safra = str(ano - 1)[-2:] + "/" + str(ano)[-2:]

        ### KPI ÁREA NACIONAL ###
        if fonte == 'todas':
            if(dados['area_plantada_ibge'] > 0):
                valor_ibge = f"{dados['area_plantada_ibge']:.1f}M ha"
                var_ibge = dados['variacao_ibge_text']
            else:
                valor_ibge = ""
                var_ibge = "Sem dados para comparação"

            kpis['area_nacional'] = {
                'modo': 'dual',
                'titulo': f'ÁREA NACIONAL (SAFRA {ano_safra})',
                'ibge': {
                    'valor': valor_ibge,
                    'variacao': var_ibge,
                    'tipo': 'positive' if 'Acima' in dados['comp_ibge'] else 'neutral',
                    'label': 'IBGE'
                },
                'conab': {
                    'valor': f"{dados['area_plantada_conab']:.1f}M ha",
                    'variacao': dados['variacao_conab_text'],
                    'tipo': 'positive' if 'Acima' in dados['comp_conab'] else 'neutral',
                    'label': 'CONAB'
                }
            }
        else:
            fonte_col = f'area_plantada_{fonte.lower()}'
            variacao_col = f'variacao_{fonte.lower()}_text'
            comp_col = f'comp_{fonte.lower()}'

            valor_coll = dados[fonte_col]
            if (valor_coll > 0):
                valor_coll_ = f"{valor_coll:.1f}M ha"
                variacao_coll_ = dados[variacao_col]
            else:
                valor_coll_ = "-"
                variacao_coll_ = "Sem dados para comparação"

            kpis['area_nacional'] = {
                'modo': 'single',
                'titulo': f'ÁREA NACIONAL (SAFRA {ano_safra})',
                'valor': valor_coll_,
                'variacao': variacao_coll_,
                'tipo': 'positive' if 'Acima' in dados[comp_col] else 'neutral',
                'label': fonte.upper()
            }
        

        ### KPI CRESCIMENTO ANUAL ###
        if fonte == 'todas':
            if(dados['variacao_ibge'] != "-"):
                valor_ibge = dados['variacao_ibge']
                var_ibge = dados['comp_ibge']
            else:
                valor_ibge = "-"
                var_ibge = "Sem dados para comparação"

            kpis['crescimento'] = {
                'modo': 'dual',
                'titulo': 'CRESCIMENTO ANUAL',
                'ibge': {
                    'valor': valor_ibge,
                    'variacao': var_ibge,
                    'tipo': 'positive' if 'Acima' in dados['comp_ibge'] else 'neutral',
                    'label': 'IBGE'
                },
                'conab': {
                    'valor': dados['variacao_conab'],
                    'variacao': dados['comp_conab'],
                    'tipo': 'positive' if 'Acima' in dados['comp_conab'] else 'neutral',
                    'label': 'CONAB'
                }
            }
        else:
            variacao_col = f'variacao_{fonte.lower()}'
            comp_col = f'comp_{fonte.lower()}'
            
            kpis['crescimento'] = {
                'modo': 'single',
                'titulo': 'CRESCIMENTO ANUAL',
                'valor': dados[variacao_col],
                'variacao': dados[comp_col],
                'tipo': 'positive' if 'Acima' in dados[comp_col] else 'neutral',
                'label': fonte.upper()
            }
        

        ### KPI GAP IBGE VS CONAB ###
        if(dados['gap_ibge_conab'] != "-"):
            valor_gap = dados['gap_ibge_conab']
        else:
            valor_gap = "-"

        kpis['gap'] = {
            'modo': 'single',
            'titulo': 'GAP IBGE vs CONAB',
            'valor': valor_gap,
            'variacao': dados['gap_ibge_conab_text'],
            'tipo': 'neutral',
            'label': f'Ano {ano}'
        }
        

        ### KPI MUNICÍPIOS PRODUTORES ###
        if (dados['qtde_mun'] > 0):
            qtde_municipios = int(dados['qtde_mun'])
            qtde_municipios = f"{qtde_municipios:,}".replace(',', '.')
            texto_variacao = dados['var_mun_text']
        else:
            qtde_municipios = "-"
            texto_variacao = 'Sem dados para comparação'
        
        kpis['municipios'] = {
            'modo': 'single',
            'titulo': 'MUNICÍPIOS PRODUTORES',
            'valor': qtde_municipios,
            'variacao': texto_variacao,
            'tipo': 'neutral',
            'label': 'Total'
        }


        return {
            'ano': ano,
            'fonte': fonte,
            'kpis': kpis
        }


    @staticmethod
    def preparar_dados_evolucao_temporal(cod_municipio='5100201'):
        df_municipios = data_loader.get('base_municipios')

        df = df_municipios[df_municipios['cod_municipio'] == cod_municipio].copy().sort_values('ano').reset_index(drop = True)
        
        info_municipio = {
            'codigo': cod_municipio,
            'nome': df.iloc[0]['municipio'],
            'uf': df.iloc[0]['uf'],
            'estado': df.iloc[0]['estado']
        }

        anos = df['ano_safra'].tolist()
        area_municipio = df['area_plantada'].tolist()
        area_resto_estado = df['area_plantada_estado_dif'].tolist()
        area_total_estado = df['area_plantada_estado'].tolist()
        variacoes_municipio = df['variacao'].tolist()
        variacoes_estado = df['variacao_estado_ano'].tolist()

        customdata_municipio = list(zip(variacoes_municipio))
        customdata_estado = list(zip(variacoes_estado, area_total_estado))

        dados_plotly = {
            'series': [
                {
                    'name': info_municipio['nome'],
                    'type': 'area',
                    'color': '#4A90E2',
                    'data': {
                        'x': anos,
                        'y': area_municipio,
                        'customdata': customdata_municipio
                    },
                    'stackgroup': 'one',
                    'info': {
                        'tipo': 'municipio',
                        'codigo': info_municipio['codigo']
                    }
                },
                {
                    'name': f"{info_municipio['estado']}",
                    'type': 'area',
                    'color': '#48C9B0',
                    'variacao': variacoes_estado,
                    'data': {
                        'x': anos,
                        'y': area_resto_estado,
                        'customdata': customdata_estado
                    },
                    'stackgroup': 'one',
                        'info': {
                        'tipo': 'estado_resto',
                        'uf': info_municipio['uf']
                    }
                }
            ],
            'metadata': {
                'y_label': 'Área Plantada (mil de hectares)',
                'municipio': info_municipio,
                'anos': anos
            }
        }

        return dados_plotly


    @staticmethod
    def preparar_dados_municipio_destaque(cod_municipio = '5100201', ano = 2021):
        df_municipios = data_loader.get('base_municipios')

        df = df_municipios[(df_municipios['cod_municipio'] == cod_municipio) & (df_municipios['ano'] == ano)].copy()
        
        dados = df.iloc[0]
        area_formatada = f"{dados['area_plantada']:.1f} mil ha"

        variacao_texto = dados['variacao']
        if variacao_texto.startswith('+'):
            variacao_formatada = f"↑ {variacao_texto}"
        elif variacao_texto.startswith('-'):
            variacao_formatada = f"↓ {variacao_texto}"
        else:
            variacao_formatada = f"{variacao_texto}"
        
        ano_safra = str(ano - 1)[-2:] + "/" + str(ano)[-2:]

        dados_municipio = {
            'identificacao': {
                'codigo': str(dados['cod_municipio']),
                'nome': dados['municipio'],
                'estado': dados['estado'],
                'uf': dados['uf'],
                'ranking': dados['ranking']
            },
            'metricas': {
                'area_plantada': {
                    'titulo': f'ÁREA PLANTADA {ano_safra}',
                    'valor': area_formatada,
                    'variacao': variacao_formatada
                },
                'representatividade': {
                    'titulo': f'% DO ESTADO ({dados["uf"]})',
                    'valor': dados['representatividade_mun'],
                    'label': 'Representatividade'
                }
            },
            'ano': ano
        }
        
        return dados_municipio


    @staticmethod
    def preparar_dados_mapa_estados(ano = 2021, fonte = 'conab'):
        df_estadual = data_loader.get('area_estadual')
    
        df = df_estadual[df_estadual['ano'] == ano].copy()

        fonte_real = 'conab' if fonte == 'todas' else fonte.lower()
        coluna_variacao = f'variacao_{fonte_real}'
        coluna_area = f'area_plantada_{fonte_real}'

        COR_POSITIVA = '#17A589'
        COR_NEGATIVA = '#CD8B8B'
        COR_NEUTRA = '#DADAD9'

        cores_estados = {}
        dados_estados = []

        for _, row in df.iterrows():
            uf = row['uf']
            variacao_texto = str(row[coluna_variacao])
            area_plantada = row[coluna_area]
            tam_text = int(len(variacao_texto))

            if variacao_texto.startswith('+'):
                cor = COR_POSITIVA
                tipo_variacao = 'positiva'
            elif ((variacao_texto.startswith('-')) &  (tam_text > 1)):
                cor = COR_NEGATIVA
                tipo_variacao = 'negativa'
            else:
                cor = COR_NEUTRA
                tipo_variacao = 'neutra'
            
            cores_estados[uf] = cor

            dados_estados.append({
                'uf': uf,
                'area_plantada': area_plantada,
                'variacao': variacao_texto,
                'tipo_variacao': tipo_variacao,
                'cor': cor
            })
        
        dados_estados_ = {
            'cores_estados': cores_estados,
            'dados_estados': dados_estados,
            'metadata': {
                'ano': ano,
                'fonte': fonte_real,
                'legenda': {
                    'positiva': {
                        'cor': COR_POSITIVA,
                        'label': 'Crescimento'
                    },
                    'negativa': {
                        'cor': COR_NEGATIVA,
                        'label': 'Retração'
                    },
                    'neutra': {
                        'cor': COR_NEUTRA,
                        'label': 'Estável'
                    }
                }
            }
        }


        return dados_estados_


    @staticmethod
    def preparar_geojson_brasil():
        try:
            geojson_data = data_loader.get('geo_estados')
            
            
            return geojson_data
        
        except Exception as e:
            print(f"Erro ao buscar GeoJSON: {e}")
            return None


    @staticmethod
    def buscar_info_municipio(cod_municipio):
        try:
            df_municipios = data_loader.get('base_municipios')
            
            df_mun = df_municipios[
                (df_municipios['cod_municipio'] == cod_municipio) &
                (df_municipios['ano'] == 2021)
            ]
            
            if df_mun.empty:
                return None
            
            dados = df_mun.iloc[0]
            

            return {
                'codigo': str(dados['cod_municipio']),
                'nome': dados['municipio'],
                'uf': dados['uf'],
                'estado': dados['estado']
            }
        

        except Exception as e:
            print(f"Erro ao buscar informações do município: {e}")
            return None


    @staticmethod
    def buscar_municipios_por_estado(uf, ano = 2021):
        try:
            df_municipios = data_loader.get('base_municipios')
            
            df_estado = df_municipios[
                (df_municipios['uf'] == uf.upper()) & 
                (df_municipios['ano'] == ano) &
                (df_municipios['area_plantada'] > 0)
            ].copy()
            
            if df_estado.empty:
                return None
            
            municipios = [
                {
                    'codigo': str(row['cod_municipio']),
                    'nome': row['municipio']
                }
                for _, row in df_estado.iterrows()
            ]
            
            return municipios
        

        except Exception as e:
            print(f"Erro ao buscar municípios do estado {uf}: {e}")
            return None
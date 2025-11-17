from flask import Blueprint, jsonify, request
from api.processors import DataProcessor

api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('/comparacao_nacional')
def get_comparacao_nacional():
    try:
        dados = DataProcessor.preparar_dados_barplot()

        return jsonify({
            'success': True,
            'data': dados,
            'message': 'Dados carregados com sucesso'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Erro ao carregar dados do gráfico'
        }), 500


@api_bp.route('/comparacao_estadual')
def get_comparacao_estadual():
    try:
        dados = DataProcessor.preparar_dados_stackedbars()

        if 'error' in dados:
            return jsonify({
                'success': False,
                'error': dados['error'],
                'message': 'Não foi possível carregar dados estaduais'
            }), 404
        

        return jsonify({
            'success': True,
            'data': dados,
            'message': f"Dados de {dados['metadata']['total_estados']} estados carregados"
        })
    

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Erro interno ao processar dados estaduais'
        }), 500


@api_bp.route('/waterfall')
def get_waterfall():
    fonte = request.args.get('fonte', 'CONAB').upper()
    periodo = request.args.get('periodo', '2019-2020')

    fontes_validas = ['IBGE', 'CONAB']
    periodos_validos = ['2019-2020', '2020-2021', '2021-2022']

    if fonte not in fontes_validas:
        return jsonify({
            'success': False,
            'error': f'Fonte inválida. Use: {", ".join(fontes_validas)}'
        }), 400
    
    if periodo not in periodos_validos:
        return jsonify({
            'success': False,
            'error': f'Período inválido. Use: {", ".join(periodos_validos)}'
        }), 400
    

    try:
        dados = DataProcessor.preparar_dados_waterfall(fonte, periodo)

        return jsonify({
            'success': True,
            'data': dados,
            'parameters': {
                'fonte': fonte,
                'periodo': periodo
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api_bp.route('/kpis')
def get_kpis():
    ano_str = request.args.get('ano', '2021')
    fonte = request.args.get('fonte', 'todas').lower()


    anos_validos = [2019, 2020, 2021, 2022]
    fontes_validas = ['todas', 'ibge', 'conab']

    try:
        ano = int(ano_str)
    except ValueError:
        return jsonify({
            'success': False,
            'error': f'Ano inválido: "{ano_str}". Deve ser um número inteiro.'
        }), 400
    
    if ano not in anos_validos:
        return jsonify({
            'success': False,
            'error': f'Ano não disponível. Anos válidos: {", ".join(map(str, anos_validos))}'
        }), 400
    
    if fonte not in fontes_validas:
        return jsonify({
            'success': False,
            'error': f'Fonte inválida. Fontes válidas: {", ".join(fontes_validas)}'
        }), 400
    

    try:
        dados = DataProcessor.preparar_dados_kpis(ano = ano, fonte = fonte)

        if 'error' in dados:
            return jsonify({
                'success': False,
                'error': dados['error'],
                'message': 'Dados não disponíveis para os parâmetros solicitados'
            }), 404
        

        return jsonify({
            'success': True,
            'data': dados,
            'parameters': {
                'ano': ano,
                'fonte': fonte
            },
            'message': 'KPIs carregados com sucesso'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Erro interno ao processar KPIs'
        }), 500


@api_bp.route('/evolucao_temporal')
def get_evolucao_temporal():
    cod_municipio = request.args.get('cod_municipio', '5100201')

    try:
        dados = DataProcessor.preparar_dados_evolucao_temporal(cod_municipio)

        if 'error' in dados:
            return jsonify({
                'success': False,
                'error': dados['error'],
                'message': 'Município não encontrado na base de dados'
            }), 404
        

        return jsonify({
            'success': True,
            'data': dados,
            'parameters': {
                'cod_municipio': cod_municipio
            },
            'message': 'Dados de evolução temporal carregados com sucesso'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Erro interno ao processar evolução temporal'
        }), 500


@api_bp.route('/municipio_destaque')
def get_municipio_destaque():
    cod_municipio = request.args.get('cod_municipio', '5100201')
    ano_str = request.args.get('ano', '2021')
    
    try:
        ano = int(ano_str)
    except ValueError:
        return jsonify({
            'success': False,
            'error': f'Ano inválido: "{ano_str}". Deve ser um número inteiro.'
        }), 400
    
    anos_validos = [2019, 2020, 2021, 2022]
    if ano not in anos_validos:
        return jsonify({
            'success': False,
            'error': f'Ano não disponível. Anos válidos: {", ".join(map(str, anos_validos))}'
        }), 400
    

    try:
        dados = DataProcessor.preparar_dados_municipio_destaque(cod_municipio, ano)
        
        if 'error' in dados:
            return jsonify({
                'success': False,
                'error': dados['error'],
                'message': 'Dados não disponíveis para o município e ano solicitados'
            }), 404
        

        return jsonify({
            'success': True,
            'data': dados,
            'parameters': {
                'cod_municipio': cod_municipio,
                'ano': ano
            },
            'message': 'Dados do município carregados com sucesso'
        })
    

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Erro interno ao processar dados do município'
        }), 500


@api_bp.route('/mapa_estados')
def get_mapa_estados():
    ano_str = request.args.get('ano', '2021')
    fonte = request.args.get('fonte', 'todas').lower()

    try:
        ano = int(ano_str)
    except ValueError:
        return jsonify({
            'success': False,
            'error': f'Ano inválido: "{ano_str}". Deve ser um número inteiro.'
        }), 400

    try:
        dados = DataProcessor.preparar_dados_mapa_estados(ano, fonte)
        
        if 'error' in dados:
            return jsonify({
                'success': False,
                'error': dados['error'],
                'message': 'Dados não disponíveis para o ano e fonte solicitados'
            }), 404
        

        return jsonify({
            'success': True,
            'data': dados,
            'parameters': {
                'ano': ano,
                'fonte': fonte
            },
            'message': 'Dados do mapa carregados com sucesso'
        })
    

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Erro interno ao processar dados do mapa'
        }), 500


@api_bp.route('/geojson_brasil')
def get_geojson_brasil():
    try:
        geojson_data = DataProcessor.preparar_geojson_brasil()

        if geojson_data is None:
            return jsonify({
                'success': False,
                'error': 'GeoJSON não disponível',
                'message': 'Erro ao carregar dados geográficos do Brasil'
            }), 500

        return jsonify(geojson_data)
    

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Erro ao carregar GeoJSON do Brasil'
        }), 500


@api_bp.route('/municipios_por_estado')
def get_municipios_por_estado():
    uf = request.args.get('uf', '').upper()
    ano_str = request.args.get('ano', '2021')

    try:
        ano = int(ano_str)
    except ValueError:
        return jsonify({
            'success': False,
            'error': f'Ano inválido: "{ano_str}". Deve ser um número inteiro.'
        }), 400


    try:
        municipios = DataProcessor.buscar_municipios_por_estado(uf, ano)
        
        if municipios is None or len(municipios) == 0:
            return jsonify({
                'success': False,
                'error': f'Nenhum município encontrado para o estado {uf}',
                'message': 'Estado não encontrado ou sem dados'
            }), 404
        
        return jsonify({
            'success': True,
            'data': {
                'uf': uf,
                'ano': ano,
                'municipios': municipios,
                'total': len(municipios)
            },
            'message': f'{len(municipios)} municípios encontrados'
        })
    

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Erro interno ao buscar municípios'
        }), 500


@api_bp.route('/municipio_info')
def get_municipio_info():
    cod_municipio = request.args.get('cod_municipio', '')

    try:
        info = DataProcessor.buscar_info_municipio(cod_municipio)
        
        if info is None:
            return jsonify({
                'success': False,
                'error': f'Município {cod_municipio} não encontrado'
            }), 404
        

        return jsonify({
            'success': True,
            'data': info
        })
    

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
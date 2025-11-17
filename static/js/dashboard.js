let mapaEstados = null;
let layerEstados = null;
let estadoSelecionado = null;
let modoComparacao = 'nacional';
let dadosMapaAtuais = null;


function inicializarDashboard() {
    console.log('Dashboard iniciando...');

    configurarFiltrosKPIs();
    
    carregarGraficoComparacao();
    configurarToggleComparacao();

    configurarFiltrosWaterfall();


    const municipioPadrao = '5100201';
    const anoPadrao = 2021;

    buscarEstadoDoMunicipio(municipioPadrao).then(uf => {
        if (uf) {
            console.log(`Município padrão está no estado: ${uf}`);
            
            carregarMapaEstados(anoPadrao, 'todas');
            
            setTimeout(() => {
                selecionarEstadoProgramaticamente(uf, municipioPadrao);
            }, 1500);
        } else {
            carregarMapaEstados(anoPadrao, 'todas');
        }
    });
    
    carregarEvolucaoTemporal(municipioPadrao);

    carregarMunicipioDestaque(municipioPadrao, anoPadrao);
}

function carregarGraficoComparacao() {
    console.log('Buscando dados da API - IBGE x CONAB por Ano...');

    fetch('/api/comparacao_nacional')
        .then(response => {
            console.log('Resposta recebida:', response);
            return response.json();
        })
        .then(data => {
            console.log('Dados convertidos!');

            if (data.success) {
                criarGraficoComDadosAPI(data.data);
            } else {
                console.error('API retornou erro:', data.message);
            }
        })
        .catch(error => {
            console.error('Erro ao buscar dados:', error);
        })
}

function criarGraficoComDadosAPI(dados) {
    console.log('Criando gráfico: Comparação de Área Plantada: IBGE vs CONAB');

    const traces = dados.series.map(serie => ({
        name: serie.name,
        x: serie.data.x.map(ano => String(ano)),
        y: serie.data.y,
        customdata: serie.data.customdata,
        type: 'bar',
        marker: { color: serie.color },
        hovertemplate:  `<b>Fonte: ${serie.name}</b><br>` +
                        'Safra: %{x}<br>' +
                        'Área: %{y:.1f} mil ha<br>' +
                        'Gap: %{customdata}<br>' +
                        '<extra></extra>',
        text: serie.data.y.map(val => val === 0 ? '' : val.toFixed(1)),
        textposition: 'outside',
        textfont: {
            size: 11,
            color: '#2C3E50'
        }
    }));

    const layout = {
        showlegend: false,
        legend: {
            orientation: 'h',
            x: 0.5,
            y: 0,
            xanchor: 'center',
            yanchor: 'top',
            font: {
                family: 'Inter, sans-serif',
                size: 12,
                color: '#2C3E50'
            }
        },
        
        xaxis: {
            title: {
                text: ''
            },
            type: 'category',
            tickfont: {
                family: 'Inter, sans-serif',
                size: 11,
                color: '#2C3E50'
            },
            showgrid: false
        },
        
        yaxis: {
            title: {
                text: 'Área Plantada (milhões de hectares)',
                font: {
                    family: 'Inter, sans-serif',
                    size: 12,
                    color: '#7F8C8D'
                }
            },
            showticklabels: false,
            ticks: '',
            showgrid: true,
            gridcolor: '#E1E8ED',
            gridwidth: 1
        },
        
        barmode: 'group',
        bargroupgap: 0.1,
        bargap: 0.3,
        
        margin: {
            l: 60,
            r: 20,
            t: 20,
            b: 20
        },
        
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        
        autosize: true
    };

    const config = {
        responsive: true,
        displayModeBar: false,
        displaylogo: false
    };

    Plotly.newPlot('grafico-comparacao-ibge-conab', traces, layout, config);
}

function carregarGraficoComparacaoEstadual() {
    console.log('Carregando visualização estadual do gráfico de comparação...');

    fetch('/api/comparacao_estadual')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderizarGraficoComparacaoEstadual(data.data);
            } else {
                console.error('Erro ao carregar dados estaduais:', data.error);
            }
        })
        .catch(error => {
            console.error('Erro na requisição:', error);
        });
}

function renderizarGraficoComparacaoEstadual(dados) {
    console.log('Renderizando gráfico de comparação com dados estaduais...');

    const coresEstados = obterCoresEstados();

    const traces = [];

    const ultimoEstadoIndex = 0;

    dados.series.forEach((estado, index) => {
        const corEstado = coresEstados[estado.uf] || '#CCCCCC';
        const ehUltimoEstado = (index === ultimoEstadoIndex);

        const traceIBGE = {
            x: estado.anos,
            y: estado.valores_ibge,
            name: estado.uf,
            type: 'bar',
            customdata: estado.variacao,
            marker: {
                color: corEstado,
                line: {
                    color: 'rgba(255, 255, 255, 0.5)'
                }
            },
            hovertemplate: `<b>${estado.uf}</b><br>` +
                          'Fonte: IBGE<br>' +
                          'Safra: %{x}<br>' +
                          'Área: %{y:.1f} mil ha<br>' +
                          'Gap: %{customdata}<br>' +
                          '<extra></extra>',
            legendgroup: estado.uf,
            showlegend: false,
            offsetgroup: 'IBGE',
            stackgroup: 'IBGE'
        }

        if (ehUltimoEstado) {
            traceIBGE.text = estado.anos.map(ano => {
                const total = dados.totais[ano]?.ibge || 0;
                return total === 0 ? '' : total.toFixed(1);
            });
            traceIBGE.textposition = 'outside';
            traceIBGE.textfont = {
                size: 11,
                color: '#2C3E50'
            };
        }

        traces.push(traceIBGE);


        const traceCONAB = {
            x: estado.anos,
            y: estado.valores_conab,
            name: estado.uf,
            type: 'bar',
            customdata: estado.variacao,
            marker: {
                color: corEstado,
                line: {
                    color: 'rgba(255, 255, 255, 0.5)'
                }
            },
            hovertemplate: `<b>${estado.uf}</b><br>` +
                          'Fonte: CONAB<br>' +
                          'Safra: %{x}<br>' +
                          'Área: %{y:.1f} mil ha<br>' +
                          'Gap: %{customdata}<br>' +
                          '<extra></extra>',
            legendgroup: estado.uf,
            showlegend: false,
            offsetgroup: 'CONAB',
            stackgroup: 'CONAB'
        }

        if (ehUltimoEstado) {
            traceCONAB.text = estado.anos.map(ano => {
                const total = dados.totais[ano]?.conab || 0;
                return total === 0 ? '' : total.toFixed(1);
            });
            traceCONAB.textposition = 'outside';
            traceCONAB.textfont = {
                size: 11,
                color: '#2C3E50'
            };
        }
        
        traces.push(traceCONAB);
    });
    
    const layout = {
        barmode: 'group',
        bargap: 0.3,
        bargroupgap: 0.1,
        
        xaxis: {
            title: '',
            type: 'category',
            tickfont: {
                family: 'Inter, sans-serif',
                size: 11,
                color: '#2C3E50'
            },
            showgrid: false
        },
        yaxis: {
            title: 'Área Plantada (milhões de hectares)',
            titlefont: {
                family: 'Inter, sans-serif',
                size: 12,
                color: '#7F8C8D'
            },
            showticklabels: false,
            ticks: '',
            showgrid: true,
            gridcolor: '#E1E8ED',
            gridwidth: 1
        },
        plot_bgcolor: '#FFFFFF',
        paper_bgcolor: '#FFFFFF',
        font: {
            family: 'Inter, sans-serif'
        },
        margin: {
            l: 60,
            r: 20,
            t: 20,
            b: 20
        },
        hovermode: 'closest'
    };
    
    const config = {
        responsive: true,
        displayModeBar: false
    };
    
    Plotly.newPlot('grafico-comparacao-ibge-conab', traces, layout, config);
    console.log('Gráfico estadual renderizado com sucesso!');
}

function obterCoresEstados() {
    return {
        'MT': '#5B9BD5',
        'RS': '#70AD47',
        'PR': '#ED7D31',
        'GO': '#9966CC',
        'MS': '#4BACC6',
        'BA': '#FFC000',
        'SP': '#8B5A9F',
        'MG': '#5EB567',
        'MA': '#E85D75',
        'PI': '#4F97C9',
        'TO': '#D4A26A',
        'SC': '#6B8DBD',
        'PA': '#C9A35C',
        'RO': '#B87BA3',
        'DF': '#C98D6E',
        'AC': '#9B7BB3',
        'AM': '#B8B85C',
        'RR': '#7B7BB8',
        'AP': '#C97B7B',
        'CE': '#5EB591',
        'PB': '#9FBD5C',
        'PE': '#C97BA3',
        'RN': '#5B9BBD',
        'SE': '#BDA382',
        'AL': '#70BDB3',
        'ES': '#B37BB8',
        'RJ': '#D98BA3'
    };
}

function configurarToggleComparacao() {
    const btnToggle = document.getElementById('toggle-view-comparacao');
    const labelView = document.getElementById('label-view-comparacao');
    
    if (!btnToggle) {
        console.error('Botão de toggle não encontrado');
        return;
    }

    btnToggle.addEventListener('click', function() {
        if (modoComparacao === 'nacional') {
            modoComparacao = 'estadual';
            btnToggle.classList.add('active');
            labelView.textContent = 'Visão Nacional';
            
            carregarGraficoComparacaoEstadual();
            
        } else {
            modoComparacao = 'nacional';
            btnToggle.classList.remove('active');
            labelView.textContent = 'Por Estado';
            
            carregarGraficoComparacao();
        }
        
        console.log(`Modo de comparação alterado para: ${modoComparacao}`);
    });
}


function carregarWaterfall(fonte = 'CONAB', periodo = '2019-2020') {
    console.log(`Carregando waterfall para: ${fonte} ${periodo}`);

    const params = new URLSearchParams({
        fonte: fonte,
        periodo: periodo
    });

    fetch(`/api/waterfall?${params}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                criarGraficoWaterfall(data.data);
            } else {
                console.error('Erro ao carregar waterfall:', data.error);
                mostrarErroWaterfall(data.error);
            }
        })
        .catch(error => {
            console.error('Erro na requisição:', error);
            mostrarErroWaterfall('Erro ao conectar com o servidor');
        });
}

function criarGraficoWaterfall(dados) {
    console.log('Criando gráfico waterfall...');
    const valoresEmMilhoes = dados.series[0].data.y;

    const valorInicial = valoresEmMilhoes[0];
    const valorFinal = valoresEmMilhoes[valoresEmMilhoes.length - 1];
    const variacaoPercentual = ((valorFinal - valorInicial) / valorInicial) * 100;

    const variacaoTexto = variacaoPercentual >= 0 
        ? `+${variacaoPercentual.toFixed(1)}%` 
        : `${variacaoPercentual.toFixed(1)}%`;
    
    const corVariacao = variacaoPercentual >= 0 ? '#17A589' : '#CD8B8B';
    const iconeVariacao = variacaoPercentual >= 0 ? '↑' : '↓';

    const container = document.getElementById('grafico-waterfall-estados');
    if (container) {
        container.innerHTML = '';
    }

    const trace = {
        type: 'waterfall',
        name: dados.series[0].name,
        orientation: 'v',
        x: dados.series[0].data.x,
        y: valoresEmMilhoes,
        measure: dados.series[0].data.measure,
        textposition: 'outside',

        increasing: {
            marker: {
                color: dados.series[0].colors.increasing,
                line: {
                    color: dados.series[0].colors.increasing,
                    width: 2
                }
            }
        },

        decreasing: {
            marker: {
                color: dados.series[0].colors.decreasing,
                line: {
                    color: dados.series[0].colors.decreasing,
                    width: 2
                }
            }
        },

        totals: {
            marker: {
                color: dados.series[0].colors.totals,
                line: {
                    color: dados.series[0].colors.totals,
                    width: 2
                }
            }
        },

        connector: {
            line: {
                color: 'rgb(63, 63, 63)',
                width: 1
            }
        }
    };

    const layout = {

        yaxis: {
            title: {
                text: 'Variação (milhares de hectares)',
                font: {
                    family: 'Inter, sans-serif',
                    size: 12,
                    color: '#7F8C8D'
                }
            },
            showticklabels: true,
            tickfont: {
                family: 'Inter, sans-serif',
                size: 10,
                color: '#2C3E50'
            },
            tickmode: 'auto',
            ticksuffix: '',
            tickformat: '.0f',
            tickvals: null,
            ticktext: null,
            tickformat: '~s',
            showgrid: true,
            gridcolor: '#E1E8ED',
            gridwidth: 1,
            range: [dados.metadata.min, dados.metadata.max]
        },

        xaxis: {
            tickfont: {
                family: 'Inter, sans-serif',
                size: 10,
                color: '#2C3E50'
            }
        },

        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',

        showlegend: false,

        height: 380,

        margin: {
            l: 60,
            r: 20,
            t: 20,
            b: 20
        },
        
        autosize: true,

        annotations: [
            {
                xref: 'paper',
                yref: 'paper',
                x: 0.5,
                y: .95,
                
                text: `<b>${iconeVariacao} VARIAÇÃO TOTAL: ${variacaoTexto}</b>`,
                
                font: {
                    family: 'Inter, sans-serif',
                    size: 13,
                    color: corVariacao
                },
                
                showarrow: false,
                
                xanchor: 'center',
                yanchor: 'bottom',
                
                bgcolor: 'rgba(255, 255, 255, 0.95)',
                bordercolor: corVariacao,
                borderwidth: 2,
                borderpad: 6
            }
        ]
    };

    const config = {
        responsive: true,
        displayModeBar: false,
        displaylogo: false
    };

    Plotly.newPlot('grafico-waterfall-estados', [trace], layout, config);
    console.log('Waterfall criado com sucesso!');
}

function mostrarErroWaterfall(mensagem) {
    document.getElementById('waterfall').innerHTML = 
        `<div class="alert alert-warning m-3" role="alert">
            <strong>Atenção:</strong> ${mensagem}
        </div>`;
}

function configurarFiltrosWaterfall() {
    console.log('Configurando filtros do waterfall...');

    const filtroFonteGlobal = document.getElementById('filtro-fonte');
    const filtroPeriodoLocal = document.getElementById('filtro-periodo-waterfall');

    if (!filtroFonteGlobal || !filtroPeriodoLocal) {
        console.error('Elementos de filtro não encontrados!');
        return;
    }

    const dadosDisponiveis = {
        'IBGE': ['2019-2020', '2020-2021'],
        'CONAB': ['2019-2020', '2020-2021', '2021-2022']
    };

    function atualizarWaterfall() {
        const fonteGlobalSelecionada = filtroFonteGlobal.value.toLowerCase();
        const periodoSelecionado = filtroPeriodoLocal.value;
        
        console.log(`Filtros mudaram!`);
        
        let fonteParaWaterfall;
        if (fonteGlobalSelecionada === 'todas') {
            fonteParaWaterfall = 'CONAB';
            console.log('Fonte global está em "Todas", usando CONAB para o waterfall');
        } else {
            fonteParaWaterfall = fonteGlobalSelecionada.toUpperCase();
        }

        console.log(`Atualizando waterfall...`);

        const periodosDisponiveis = dadosDisponiveis[fonteParaWaterfall];
        const temDados = periodosDisponiveis && periodosDisponiveis.includes(periodoSelecionado);
        
        const sub_waterfall = document.getElementById('subtitulo_waterfall');
        if (sub_waterfall){
            let esquerda_per = periodoSelecionado.split("-")[0];
            esquerda_per = parseInt(esquerda_per);

            let ano_safra = String(esquerda_per - 1).slice(-2) + "/" + String(esquerda_per).slice(-2);

            
            let direita_per = periodoSelecionado.split("-")[1];
            direita_per = parseInt(direita_per);

            ano_safra = ano_safra + " → " + String(direita_per - 1).slice(-2) + "/" + String(direita_per).slice(-2);


            sub_waterfall.textContent = `Contribuição para crescimento nacional (${ano_safra})`;
        }

        const tit_waterfall = document.getElementById('titulo_waterfall');
        tit_waterfall.textContent = `Variação por Estado ${fonteParaWaterfall}`;
        
        if (!temDados) {
            console.log(`Dados não disponíveis para ${fonteParaWaterfall} no período ${periodoSelecionado}`);
            mostrarMensagemWaterfall(fonteParaWaterfall, periodoSelecionado);
            return;
        }
        
        carregarWaterfall(fonteParaWaterfall, periodoSelecionado);
    }

    filtroFonteGlobal.addEventListener('change', atualizarWaterfall);
    filtroPeriodoLocal.addEventListener('change', atualizarWaterfall);
    
    console.log('Event listeners do waterfall configurados com sucesso!');

    atualizarWaterfall();
}

function mostrarMensagemWaterfall(fonte, periodo) {
    console.log(`Mostrando mensagem de dados indisponíveis!`)

    const container = document.getElementById('grafico-waterfall-estados');
    
    if (!container) {
        console.error('Container do waterfall não encontrado!');
        return;
    }

    const [anoInicio, anoFim] = periodo.split('-');


    let mensagemPrincipal, mensagemSecundaria, sugestao;
    mensagemPrincipal = `Dados do IBGE para para safra 21/22 ainda não disponíveis`;
    mensagemSecundaria = `O IBGE/PAM ainda não publicou os dados consolidados da safra 21/22. A pesquisa municipal completa requer mais tempo para processamento e validação estatística.`;
    sugestao = `Você pode visualizar os dados da CONAB para este período, ou selecionar um período anterior para ver os dados do IBGE.`;

    container.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 300px;
            padding: 2rem;
            text-align: center;
        ">
            <!-- Ícone visual para chamar atenção -->
            <div style="
                width: 64px;
                height: 64px;
                background: linear-gradient(135deg, #E8F4F8 0%, #F5F7FA 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 1.5rem;
                border: 2px solid #E1E8ED;
            ">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7F8C8D" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            
            <!-- Mensagem principal em destaque -->
            <h3 style="
                color: #2B4C7E;
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 0.75rem;
                font-family: 'Inter', sans-serif;
            ">
                ${mensagemPrincipal}
            </h3>
            
            <!-- Explicação detalhada -->
            <p style="
                color: #7F8C8D;
                font-size: 14px;
                line-height: 1.6;
                max-width: 500px;
                margin-bottom: 1rem;
                font-family: 'Inter', sans-serif;
            ">
                ${mensagemSecundaria}
            </p>
            
            <!-- Sugestão de ação -->
            <p style="
                color: #2C3E50;
                font-size: 13px;
                font-weight: 500;
                max-width: 500px;
                padding: 0.75rem 1rem;
                background: #F5F7FA;
                border-radius: 8px;
                border-left: 3px solid #4A90E2;
                font-family: 'Inter', sans-serif;
            ">
                💡 ${sugestao}
            </p>
        </div>
    `;
}



function carregarKPIs(ano = 2021, fonte = 'todas') {
    console.log(`Carregando KPIs para ano ${ano}, fonte: ${fonte}`);

    const params = new URLSearchParams({
        ano: ano,
        fonte: fonte
    });

    fetch(`/api/kpis?${params}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderizarKPIs(data.data);
            } else {
                console.error('API retornou erro:', data.error);
                mostrarErroKPIs(data.error);
            }
        })
        .catch(error => {
            console.error('Erro ao buscar KPIs:', error);
            mostrarErroKPIs('Erro ao conectar com o servidor');
        });
}

function renderizarKPIs(dados) {
    console.log('Renderizando KPIs...');
    
    const kpis = dados.kpis;

    renderizarKPIIndividual('kpi-area-nacional', kpis.area_nacional);
    renderizarKPIIndividual('kpi-crescimento', kpis.crescimento);
    renderizarKPIIndividual('kpi-gap', kpis.gap);
    renderizarKPIIndividual('kpi-municipios', kpis.municipios);

    console.log('KPIs renderizados com sucesso!');
}

function renderizarKPIIndividual(elementId, dadosKPI) {
    const elemento = document.getElementById(elementId);

    if (!elemento) {
        console.error(`Elemento ${elementId} não encontrado no DOM`);
        return;
    }

    if (dadosKPI.modo === 'dual') {
        elemento.innerHTML = `
            <div class="kpi-label">${dadosKPI.titulo}</div>
            <div class="kpi-dual-container">
                <div class="kpi-dual-item">
                    <div class="kpi-dual-label">${dadosKPI.ibge.label}</div>
                    <div class="kpi-value">${dadosKPI.ibge.valor}</div>
                    <div class="kpi-change ${dadosKPI.ibge.tipo}">
                        ${dadosKPI.ibge.tipo === 'positive' ? '<span class="arrow">↑</span>' : ''}
                        ${dadosKPI.ibge.variacao}
                    </div>
                </div>
                <div class="kpi-dual-divider"></div>
                <div class="kpi-dual-item">
                    <div class="kpi-dual-label">${dadosKPI.conab.label}</div>
                    <div class="kpi-value">${dadosKPI.conab.valor}</div>
                    <div class="kpi-change ${dadosKPI.conab.tipo}">
                        ${dadosKPI.conab.tipo === 'positive' ? '<span class="arrow">↑</span>' : ''}
                        ${dadosKPI.conab.variacao}
                    </div>
                </div>
            </div>
        `;
    } else if (dadosKPI.modo === 'single') {
        elemento.innerHTML = `
            <div class="kpi-label">${dadosKPI.titulo}</div>
            <div class="kpi-value">${dadosKPI.valor}</div>
            <div class="kpi-change ${dadosKPI.tipo}">
                ${dadosKPI.tipo === 'positive' ? '<span class="arrow">↑</span>' : ''}
                ${dadosKPI.tipo === 'negative' ? '<span class="arrow">↓</span>' : ''}
                ${dadosKPI.variacao}
            </div>
        `;
    }
}

function mostrarErroKPIs(mensagem) {
    const secaoKPIs = document.querySelector('.kpi-grid');
    
    if (secaoKPIs) {
        secaoKPIs.innerHTML = `
            <div class="col-span-4" style="grid-column: 1 / -1;">
                <div class="alert alert-warning m-3" role="alert">
                    <strong>Atenção:</strong> ${mensagem}
                </div>
            </div>
        `;
    }
}

function configurarFiltrosKPIs() {
    console.log('Configurando filtros dos KPIs...');

    const filtroAno = document.getElementById('filtro-ano');
    const filtroFonte = document.getElementById('filtro-fonte');
    const Munic = document.getElementById('municipio-codigo');
    const AnoMapa = document.getElementById('subt_mapa');
    const TitMapa = document.getElementById('tit_mapa');
    const label_area_plantada = document.getElementById('label_area_plantada');

    if (!filtroAno || !filtroFonte || !Munic) {
        console.error('Elementos de filtro não encontrados no DOM!');
        console.error('filtro-ano:', filtroAno);
        console.error('filtro-fonte:', filtroFonte);
        console.error('Municipio:', Munic);
        console.error('AnoMapa:', AnoMapa);
        return;
    }

    function atualizarKPIs() {
        const anoSelecionado = parseInt(filtroAno.value);
        const fonteSelecionada = filtroFonte.value.toLowerCase();
        const municSelecionado = Munic.value;

        console.log(`Filtros mudaram! Recarregando KPIs...`);

        carregarKPIs(anoSelecionado, fonteSelecionada);

        if (fonteSelecionada === 'ibge' && anoSelecionado === 2022) {
            console.warn('Dados do IBGE para 2022 não disponíveis, exibindo mensagem...');
            mostrarErroMapa();
            
            if (mapaEstados !== null) {
                mapaEstados.remove();
                mapaEstados = null;
                layerEstados = null;
            }
        } else {
            carregarMapaEstados(parseInt(anoSelecionado), fonteSelecionada);
        }

        carregarMunicipioDestaque(municSelecionado, parseInt(anoSelecionado));

        if (AnoMapa) {
            const ano_safra = String(anoSelecionado - 1).slice(-2) + "/" + String(anoSelecionado).slice(-2);
            AnoMapa.textContent = `Área plantada por estado safra ${ano_safra}`;
        }

        if (TitMapa) {
            if (fonteSelecionada === "todas" || fonteSelecionada === "conab") {
                fontecorreta = "CONAB"
            } else {
                fontecorreta = "IBGE"
            }

            TitMapa.textContent = `Distribuição Geográfica ${fontecorreta}`;
        }
        if (label_area_plantada) {
            if (anoSelecionado == 2022) {
                const Tit_Area_sel = label_area_plantada.value
                label_area_plantada.textContent = Tit_Area_sel + '<span style="font-size: 9px;"> - por inferência</span>'
            }
        }
    }

    filtroAno.addEventListener('change', atualizarKPIs);
    filtroFonte.addEventListener('change', atualizarKPIs);
    
    atualizarKPIs();
}



function carregarEvolucaoTemporal(cod_municipio = '5100201') {
    console.log(`Carregando evolução temporal`);

    const params = new URLSearchParams({
        cod_municipio: cod_municipio
    });

    fetch(`/api/evolucao_temporal?${params}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                criarGraficoEvolucaoTemporal(data.data);
            } else {
                console.error('API retornou erro:', data.error);
                mostrarErroEvolucaoTemporal(data.error);
            }
        })
        .catch(error => {
            console.error('Erro na requisição:', error);
            mostrarErroEvolucaoTemporal('Erro ao conectar com o servidor');
        });
}

function criarGraficoEvolucaoTemporal(dados) {
    console.log('Criando gráfico de evolução temporal...');

    const traces = dados.series.map(serie => {
        let fillColor;
        let hovertemplate;

        if (serie.color === '#4A90E2') {
            fillColor = 'rgba(74, 144, 226, 0.6)';

            hovertemplate = '<b>%{fullData.name}</b><br>' +
                       'Safra: %{x}<br>' +
                       'Área: %{y:.1f} mil ha<br>' +
                       'Variação: %{customdata}<br>' +
                       '<extra></extra>';
        } else if (serie.color === '#48C9B0') {
            fillColor = 'rgba(72, 201, 176, 0.6)';

            hovertemplate = '<b>%{fullData.name}</b><br>' +
                       'Safra: %{x}<br>' +
                       'Área: %{customdata[1]:.1f} mil ha<br>' +
                       'Variação: %{customdata[0]}<br>' +
                       '<extra></extra>';
        }
        
        return {
            name: serie.name,
            x: serie.data.x,
            y: serie.data.y,
            customdata: serie.data.customdata,
            type: 'scatter',
            mode: 'lines+markers',
            fill: 'tonexty',
            fillcolor: fillColor,

            line: {
                width: 2,
                color: serie.color
            },

            marker: {
                size: 8,
                color: serie.color,
                line: {
                    width: 2,
                    color: '#FFFFFF'
                }
            },

            hovertemplate: hovertemplate,
            stackgroup: 'one'
        }
    });

    const layout = {
        showlegend: true,
        legend: {
            orientation: 'h',
            x: 0.5,
            y: -0.15,
            xanchor: 'center',
            yanchor: 'top',
            font: {
                family: 'Inter, sans-serif',
                size: 12,
                color: '#2C3E50'
            }
        },

        xaxis: {
            title: {
                text: ''
            },
            tickmode: 'array',
            tickvals: dados.metadata.anos,
            ticktext: dados.metadata.anos.map(String),
            tickfont: {
                family: 'Inter, sans-serif',
                size: 11,
                color: '#2C3E50'
            },
            showgrid: false
        },

        yaxis: {
            title: {
                text: dados.metadata.y_label,
                font: {
                    family: 'Inter, sans-serif',
                    size: 12,
                    color: '#7F8C8D'
                }
            },
            tickfont: {
                family: 'Inter, sans-serif',
                size: 10,
                color: '#2C3E50'
            },
            showgrid: true,
            gridcolor: '#E1E8ED',
            gridwidth: 1
        },

        margin: {
            l: 60,
            r: 20,
            t: 20,
            b: 60
        },

        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',

        height: 220,

        autosize: true
    }

    const config = {
        responsive: true,
        displayModeBar: false,
        displaylogo: false
    };

    Plotly.newPlot('grafico-evolucao-temporal', traces, layout, config);
}

function mostrarErroEvolucaoTemporal(mensagem) {
    console.log('Mostrando mensagem de erro na evolução temporal');

    document.getElementById('subtitulo_evtemp').innerHTML = 
        `<div class="alert alert-warning m-3" role="alert">
            <strong>Atenção:</strong> ${mensagem}
        </div>`;
}



function carregarMunicipioDestaque(cod_municipio = '5100201', ano = 2021) {
    console.log(`Carregando município em destaque: ${cod_municipio}, ano ${ano}`);

    const params = new URLSearchParams({
        cod_municipio: cod_municipio,
        ano: ano
    });

    fetch(`/api/municipio_destaque?${params}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderizarMunicipioDestaque(data.data);
            } else {
                console.error('API retornou erro:', data.error);
                mostrarErroMunicipioDestaque(data.error);
            }
        })
        .catch(error => {
            console.error('Erro na requisição:', error);
            mostrarErroMunicipioDestaque('Erro ao conectar com o servidor');
        });
}

function renderizarMunicipioDestaque(dados) {
    console.log('Renderizando card de município em destaque...');

    const elemNome = document.getElementById('municipio-nome');
    if (elemNome) {
        elemNome.textContent = dados.identificacao.nome;
    }

    const elemRanking = document.getElementById('municipio-ranking');
    if (elemRanking) {
        elemRanking.textContent = ` - ${dados.identificacao.ranking}`;
    }

    const elemEstado = document.getElementById('municipio-estado');
    if (elemEstado) {
        elemEstado.textContent = `${dados.identificacao.estado} - ${dados.identificacao.uf}`;
    }

    const elemCodigo = document.getElementById('municipio-codigo');
    if (elemCodigo) {
        elemCodigo.textContent = dados.identificacao.codigo;
    }
    
    const sub_evtemp = document.getElementById('subtitulo_evtemp');
    if (sub_evtemp){
        sub_evtemp.textContent = `Comparação Estado ${dados.identificacao.estado} vs ${dados.identificacao.nome}`;
    }

    dados_titulo_mun = dados.metricas.area_plantada.titulo;
    if (dados_titulo_mun.includes('2022')) {
        dados_titulo_mun = dados_titulo_mun + '<span style="font-size: 9px;"> - por inferência</span>'
    }

    const metricsContainer = document.querySelector('.municipio-metrics');
    if (metricsContainer) {
        metricsContainer.innerHTML = `
            <div class="metric-item">
                <div class="metric-label">${dados_titulo_mun}</div>
                <div class="metric-value">${dados.metricas.area_plantada.valor}</div>
                <div class="metric-change">${dados.metricas.area_plantada.variacao}</div>
            </div>

            <div class="metric-item">
                <div class="metric-label">${dados.metricas.representatividade.titulo}</div>
                <div class="metric-value">${dados.metricas.representatividade.valor}</div>
                <div class="metric-change">${dados.metricas.representatividade.label}</div>
            </div>
        `;
    }
    
    console.log('Card de município renderizado com sucesso!');
}

function mostrarErroMunicipioDestaque(mensagem) {
    console.log('Mostrando mensagem de erro no card de município');

    document.getElementById('tit_mun_destaque').innerHTML = 
        `<div class="alert alert-warning m-3" role="alert">
            <strong>Atenção:</strong> ${mensagem}
        </div>`;
}

function configurarFiltrosMunicipioDestaque() {
    console.log('Configurando filtros do município em destaque...');

    const filtroAno = document.getElementById('filtro-ano');
    const filtroMun = document.getElementById('municipio-codigo');

    if (!filtroAno || !filtroMun) {
        console.error('Elementos de filtro não encontrados no DOM!');
        console.error('filtro-ano:', filtroAno);
        console.error('filtro-mun:', filtroMun);
        return;
    }

    function atualizarMunDest() {
        const anoSelecionado = parseInt(filtroAno.value);
        const municipioSelecionado = filtroMun.value;

        console.log(`Filtros mudaram! Recarregando Município em destaque...`);

        carregarMunicipioDestaque(municipioSelecionado, anoSelecionado);
    }

    filtroAno.addEventListener('change', atualizarMunDest);
    filtroMun.addEventListener('change', atualizarMunDest);
    
    atualizarMunDest();
}



function carregarMapaEstados(ano = 2021, fonte = 'todas') {
    console.log(`Carregando mapa de estados: ano ${ano}, fonte ${fonte}`);

    const params = new URLSearchParams({
        ano: ano,
        fonte: fonte
    });

    fetch(`/api/mapa_estados?${params}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (mapaEstados === null) {
                    criarMapaEstados(data.data);
                } else {
                    atualizarCoresEstados(data.data);
                }
            } else {
                console.error('API retornou erro:', data.error);
                mostrarErroMapa(data.error);
            }
        })
        .catch(error => {
            console.error('Erro na requisição:', error);
            mostrarErroMapa('Erro ao conectar com o servidor');
        });
}

function criarMapaEstados(dados) {
    console.log('Criando mapa de estados pela primeira vez...');

    dadosMapaAtuais = dados;

    mapaEstados = L.map('mapa-brasil', {
        center: [-14.235, -51.925],
        zoom: 4,
        minZoom: 4,
        maxZoom: 8,
        zoomControl: false,
        scrollWheelZoom: true,
        dragging: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(mapaEstados);

    fetch('/api/geojson_brasil')
        .then(response => response.json())
        .then(geojsonData => {
            layerEstados = L.geoJSON(geojsonData, {
                style: function(feature) {
                    const uf = feature.properties.sigla;
                    
                    const cor = dados.cores_estados[uf] || '#CCCCCC';
                    
                    return {
                        fillColor: cor,
                        fillOpacity: 0.7,
                        color: '#FFFFFF',
                        weight: 1,
                        opacity: 1
                    };
                },
                onEachFeature: function(feature, layer) {
                    const uf = feature.properties.sigla;

                    const dadosEstado = dados.dados_estados.find(d => d.uf === uf);
                    
                    if (dadosEstado) {
                        const tooltipContent = `
                            <div style="font-family: 'Inter', sans-serif;">
                                <strong style="font-size: 14px; color: #2B4C7E;">${uf}</strong><br>
                                <span style="font-size: 12px; color: #7F8C8D;">
                                    Área: ${dadosEstado.area_plantada} mil ha<br>
                                    Variação: ${dadosEstado.variacao}
                                </span>
                            </div>
                        `;
                        
                        layer.bindTooltip(tooltipContent, {
                            permanent: false,
                            direction: 'top',
                            offset: [0, -10]
                        });
                    }
                    
                    layer.on({
                        mouseover: function(e) {
                            const layer = e.target;
                            layer.setStyle({
                                weight: 3,
                                color: '#2B4C7E',
                                fillOpacity: 0.9
                            });
                        },
                        mouseout: function(e) {
                            const uf = e.target.feature.properties.sigla;
                            const corOriginal = dadosMapaAtuais ? 
                                dadosMapaAtuais.cores_estados[uf] || '#CCCCCC' : 
                                '#CCCCCC';
                            
                            e.target.setStyle({
                                fillColor: corOriginal,
                                fillOpacity: 0.7,
                                color: '#FFFFFF',
                                weight: 1,
                                opacity: 1
                            });
                            
                            if (estadoSelecionado && 
                                e.target.feature.properties.sigla === estadoSelecionado) {
                                e.target.setStyle({
                                    weight: 3,
                                    color: '#4A90E2',
                                    fillOpacity: 0.9
                                });
                            }
                        },
                        click: function(e) {
                            const uf = e.target.feature.properties.sigla;
                            selecionarEstado(uf, e.target);
                        }
                    });
                }
            }).addTo(mapaEstados);
            
            console.log('Mapa criado com sucesso!');
        })
        .catch(error => {
            console.error('Erro ao carregar GeoJSON:', error);
            mostrarErroMapa('Erro ao carregar mapa do Brasil');
        });
}

function atualizarCoresEstados(dados) {
    console.log('Atualizando cores dos estados no mapa...');

    if (!mapaEstados || !layerEstados) {
        console.warn('Mapa ainda não foi criado, ignorando atualização de cores');
        return;
    }

    dadosMapaAtuais = dados;

    layerEstados.eachLayer(function(layer) {
        const uf = layer.feature.properties.sigla;

        const novaCor = dados.cores_estados[uf] || '#CCCCCC';

        layer.setStyle({
            fillColor: novaCor,
            fillOpacity: 0.7,
            color: '#FFFFFF',
            weight: 1,
            opacity: 1
        });

        const dadosEstado = dados.dados_estados.find(d => d.uf === uf);

        if (dadosEstado) {
            const tooltipContent = `
                <div style="font-family: 'Inter', sans-serif;">
                    <strong style="font-size: 14px; color: #2B4C7E;">${uf}</strong><br>
                    <span style="font-size: 12px; color: #7F8C8D;">
                        Área: ${dadosEstado.area_plantada} mil ha<br>
                        Variação: ${dadosEstado.variacao}
                    </span>
                </div>
            `;
            
            layer.setTooltipContent(tooltipContent);
        }
    });

    console.log('Cores do mapa atualizadas com sucesso!');
}

function selecionarEstado(uf, layer) {
    console.log(`Estado selecionado: ${uf}`);

    if (estadoSelecionado) {
        layerEstados.eachLayer(function(l) {
            if (l.feature.properties.sigla === estadoSelecionado) {
                layerEstados.resetStyle(l);
            }
        });
    }

    layer.setStyle({
        weight: 3,
        color: '#4A90E2',
        fillOpacity: 0.9
    });

    estadoSelecionado = uf;

    carregarMunicipiosEstado(uf);
}

function carregarMunicipiosEstado(uf) {
    console.log(`Carregando municípios do estado: ${uf}`);

    const selectAno = document.getElementById('filtro-ano');
    const anoAtual = selectAno ? selectAno.value : '2021';

    const params = new URLSearchParams({ 
        uf: uf,
        ano: anoAtual
    });

    fetch(`/api/municipios_por_estado?${params}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                popularDropdownMunicipios(data.data.municipios, uf);
            } else {
                console.error('Erro ao carregar municípios:', data.error);
            }
        })
        .catch(error => {
            console.error('Erro na requisição de municípios:', error);
        });
}

function popularDropdownMunicipios(municipios, uf) {
    console.log(`Populando dropdown com ${municipios.length} municípios`);

    const selectMunicipio = document.getElementById('select-municipio');

    if (!selectMunicipio) {
        console.error('Elemento select-municipio não encontrado no DOM');
        return;
    }

    selectMunicipio.innerHTML = '';

    const optionPadrao = document.createElement('option');
    optionPadrao.value = '';
    optionPadrao.textContent = `Selecione um município de ${uf}`;
    optionPadrao.disabled = true;
    optionPadrao.selected = true;
    selectMunicipio.appendChild(optionPadrao);

    municipios.sort((a, b) => a.nome.localeCompare(b.nome));

    municipios.forEach(municipio => {
        const option = document.createElement('option');
        option.value = municipio.codigo;
        option.textContent = municipio.nome;
        selectMunicipio.appendChild(option);
    });

    selectMunicipio.onchange = function() {
        const codigoMunicipio = this.value;
        if (codigoMunicipio) {
            selecionarMunicipio(codigoMunicipio);
        }
    };

    const containerSelect = document.getElementById('container-select-municipio');
    if (containerSelect) {
        containerSelect.style.display = 'block';
    }
}

function selecionarMunicipio(codigoMunicipio) {
    console.log(`Município selecionado: ${codigoMunicipio}`);

    const filtroAno = document.getElementById('filtro-ano');

    if (!filtroAno) {
        console.error('Elementos de filtro não encontrados no DOM!');
        console.error('filtro-ano:', filtroAno);
        return;
    }

    const anoSelecionado = parseInt(filtroAno.value);

    carregarEvolucaoTemporal(codigoMunicipio);
    carregarMunicipioDestaque(codigoMunicipio, anoSelecionado);

    const secaoEvolucao = document.getElementById('grafico-evolucao-temporal');
    if (secaoEvolucao) {
        secaoEvolucao.scrollIntoView({ 
            behavior: 'smooth',
            block: 'nearest'
        });
    }
}

function mostrarErroMapa(mensagem) {
    console.log('Mostrando mensagem de erro no card do mapa');

    document.getElementById('subt_mapa').innerHTML = 
        `<div class="alert alert-warning m-3" role="alert">
            <strong>Atenção:</strong> ${mensagem}
        </div>`;
    
    const container = document.getElementById('mapa-brasil');
    
    if (!container) {
        console.error('Container do mapa não encontrado!');
        return;
    }

    container.style.minHeight = 'auto';
    container.style.height = 'auto';
    container.style.display = 'block';
    container.style.width = '100%';
    container.style.background = 'transparent';

    let mensagemPrincipal, mensagemSecundaria, sugestao;

    mensagemPrincipal = `Dados do IBGE para safra 21/22 ainda não disponíveis`;
    mensagemSecundaria = `O IBGE/PAM ainda não publicou os dados consolidados da safra 21/22. A pesquisa municipal completa requer mais tempo para processamento e validação estatística.`;
    sugestao = `Você pode visualizar os dados da CONAB para este ano, ou selecionar um ano anterior para ver os dados do IBGE.`;

    container.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            padding: 2rem;
            text-align: center;
            background: #F8F9FA;
            border-radius: 8px;
        ">
            <!-- Ícone de mapa com alerta -->
            <div style="
                width: 64px;
                height: 64px;
                background: linear-gradient(135deg, #E8F4F8 0%, #F5F7FA 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 1.5rem;
                border: 2px solid #E1E8ED;
            ">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7F8C8D" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
            </div>
            
            <!-- Mensagem principal em destaque -->
            <h3 style="
                color: #2B4C7E;
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 0.75rem;
                font-family: 'Inter', sans-serif;
            ">
                ${mensagemPrincipal}
            </h3>
            
            <!-- Explicação detalhada -->
            <p style="
                color: #7F8C8D;
                font-size: 14px;
                line-height: 1.6;
                max-width: 500px;
                margin-bottom: 1rem;
                font-family: 'Inter', sans-serif;
            ">
                ${mensagemSecundaria}
            </p>
            
            <!-- Sugestão de ação -->
            <p style="
                color: #2C3E50;
                font-size: 13px;
                font-weight: 500;
                max-width: 500px;
                padding: 0.75rem 1rem;
                background: #F5F7FA;
                border-radius: 8px;
                border-left: 3px solid #4A90E2;
                font-family: 'Inter', sans-serif;
            ">
                💡 ${sugestao}
            </p>
        </div>
    `;
}

function buscarEstadoDoMunicipio(codigoMunicipio) {
    console.log(`Buscando estado do município ${codigoMunicipio}`);

    const params = new URLSearchParams({ cod_municipio: codigoMunicipio });

    return fetch(`/api/municipio_info?${params}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                return data.data.uf;
            } else {
                console.error('Erro ao buscar informações do município:', data.error);
                return null;
            }
        })
        .catch(error => {
            console.error('Erro na requisição:', error);
            return null;
        });
}

function selecionarEstadoProgramaticamente(uf, codigoMunicipio) {
    console.log(`Selecionando estado ${uf} programaticamente`);

    if (!mapaEstados || !layerEstados) {
        console.warn('Mapa ainda não está pronto, tentando novamente...');
        setTimeout(() => selecionarEstadoProgramaticamente(uf, codigoMunicipio), 500);
        return;
    }

    layerEstados.eachLayer(function(layer) {
        if (layer.feature.properties.sigla === uf) {
            selecionarEstado(uf, layer);
            
            setTimeout(() => {
                const selectMunicipio = document.getElementById('select-municipio');
                if (selectMunicipio) {
                    selectMunicipio.value = codigoMunicipio;
                }
            }, 500);
        }
    });
}



document.addEventListener('DOMContentLoaded', inicializarDashboard);
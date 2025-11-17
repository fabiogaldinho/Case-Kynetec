# **DASHBOARD EXECUTIVO DA EVOLUÇÃO DA ÁREA PLANTADA DE SOJA NO BRASIL**
Dashboard executivo para comparação de dados de cultivo de soja entre IBGE e CONAB, desenvolvido como parte do processo seletivo para Kynetec.
<br>

Este dashboard foi desenvolvido como uma aplicação web utilizando Flask, uma escolha estratégica que combina a robustez do Python para processamento de dados com a flexibilidade do JavaScript para visualizações interativas. Optei por uma arquitetura que separa claramente as responsabilidades: todo o processamento pesado de dados acontece no backend através de processadores especializados, que recebem os datasets (previamente tratados em Jupyter Notebook), aplicam as transformações necessárias e entregam ao frontend estruturas de dados prontas para consumo direto pelo Plotly.js e Leaflet.

Essa abordagem mantém o frontend leve e responsivo, mesmo ao lidar com mapas interativos e grandes volumes de dados agrícolas. O dashboard implementa uma hierarquia inteligente de filtros - globais (safra e fonte) que afetam toda a aplicação, e locais em componentes específicos, sempre com lógica de fallback para garantir que o usuário executivo tenha insights disponíveis em qualquer combinação de parâmetros. O objetivo foi entregar performance, escalabilidade e uma experiência fluida sem depender de frameworks pesados, para mostrar que simplicidade bem arquitetada supera complexidade desnecessária.

## **COMO RODAR O PROJETO LOCALMENTE**
### **PRÉ-REQUISITO**
- Python 3.13;
- pip (gerenciador de pacotes Python)

### **INSTALAÇÃO**
#### **1. CLONE O REPOSITÓRIO**
```bash
git clone https://github.com/fabiogaldinho/Case-Kynetec.git
cd <nome-da-pasta>
```

#### **2. CRIE UM AMBIENTE VIRTUAL**
```bash
py -3.13 -m venv venv
.\venv\Scripts\activate
```

#### **3. INSTALE AS DEPENDÊNCIAS**
```bash
pip install -r requirements.txt
```

#### **4. EXECUTE A APLICAÇÃO**
```bash
python app.py
```

#### **5. ACESSE O DASHBOARD**
Abra seu navegador e acesse:
```
http://localhost:5000
```
<br>

## **AUTOR**

**Fábio Galdino**
from flask import Flask, render_template
from flask_cors import CORS
from config import config
from api.routes import api_bp
from api.data_loader import data_loader
import os


def create_app(config_name = 'development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    CORS(app)

    app.register_blueprint(api_bp)
        
    @app.route('/')
    def index():
        return render_template('dashboard.html')
    

    with app.app_context():
        data_loader.load_all_data()
        print("Dados carregados com sucesso!")
    
    return app


if __name__ == '__main__':
    env = 'production' if os.environ.get('PORT') else 'development'

    app = create_app(env)
    port = int(os.environ.get('PORT', 5000))

    app.run(host='0.0.0.0', port=port, debug=(env == 'development'))
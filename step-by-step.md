# How to run Back-End
cd backend/
1st: python -m venv venv
1st: pip install fastapi uvicorn sqlalchemy psycopg2-binary



venv\\Scripts\\activate
uvicorn main:app --reload


# How to open Swagger
http://localhost:8000/docs


# Delete database
docker-compose down -v

# Create database
docker-compose up -d



# How to run Front-End
1st: npm install -g @angular/cli
1st: npm install

cd frontend/
ng serve
# How to run Back-End
cd backend/
venv\\Scripts\\activate
uvicorn main:app --reload


# How to open Swagger
http://localhost:8000/docs


# Delete database
docker-compose down -v

# Create database
docker-compose up -d



# How to run Front-End
cd frontend/
ng serve
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Repetitio.sln ./
COPY src/backend/Repetitio.Domain/Repetitio.Domain.csproj src/backend/Repetitio.Domain/
COPY src/backend/Repetitio.Application/Repetitio.Application.csproj src/backend/Repetitio.Application/
COPY src/backend/Repetitio.Infrastructure/Repetitio.Infrastructure.csproj src/backend/Repetitio.Infrastructure/
COPY src/backend/Repetitio.Api/Repetitio.Api.csproj src/backend/Repetitio.Api/

RUN dotnet restore src/backend/Repetitio.Api/Repetitio.Api.csproj

COPY . .
RUN dotnet publish src/backend/Repetitio.Api/Repetitio.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS runtime
WORKDIR /app
EXPOSE 8080

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "Repetitio.Api.dll"]

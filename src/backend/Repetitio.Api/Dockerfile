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

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS sandbox
WORKDIR /app
RUN command -v timeout
COPY --from=build /app/publish .
USER 1654:1654
ENTRYPOINT ["timeout", "--kill-after=1s", "12s", "dotnet", "Repetitio.Api.dll", "--basics-sandbox"]

FROM sandbox AS basics-worker
USER root
RUN install -d -o 1654 -g 1654 -m 0700 /run/repetitio-basics
USER 1654:1654
ENTRYPOINT ["dotnet", "Repetitio.Api.dll", "--basics-worker", "/run/repetitio-basics/execute.sock"]

FROM runtime AS app

FROM python:3.12-slim
WORKDIR /app
COPY pvwallbox ./pvwallbox
VOLUME /data
EXPOSE 8080
CMD ["python", "-m", "pvwallbox.main", "-c", "/data/config.toml"]

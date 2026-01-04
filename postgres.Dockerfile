# Build Postgres with pg_jsonschema extension
FROM postgres:16

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       git \
       build-essential \
       ca-certificates \
       pkg-config \
       postgresql-server-dev-16 \
    && git clone https://github.com/supabase/pg_jsonschema.git /tmp/pg_jsonschema \
    && cd /tmp/pg_jsonschema \
    && make \
    && make install \
    && rm -rf /var/lib/apt/lists/* /tmp/pg_jsonschema

# Reuse official entrypoint
COPY --from=postgres:16 /usr/local/bin/docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["postgres"]


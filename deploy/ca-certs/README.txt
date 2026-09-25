# Pasta para certificados raiz EXTRAS (.crt em PEM) que o build precisa confiar.
# Vazia por padrão. Só é necessária em redes que inspecionam TLS (antivírus/firewall
# corporativo) — sintoma: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" no npm ci durante o build.
# Ver deploy/README.md, seção "Rede com inspeção de TLS".

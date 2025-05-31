# Используем официальный образ Apache2
FROM httpd:2.4

# Копируем конфигурационные файлы (если есть)
COPY ./conf/httpd.conf /usr/local/apache2/conf/httpd.conf

# Копируем веб-контент в контейнер
COPY ./htdocs /usr/local/apache2/htdocs/

# Устанавливаем права доступа
RUN chown -R www-data:www-data /usr/local/apache2/htdocs

# Открываем порт 80 для веб-доступа
EXPOSE 80

# Запускаем Apache в foreground режиме
CMD ["httpd-foreground"] 
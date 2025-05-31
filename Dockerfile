# Используем официальный образ Apache2
FROM httpd:2.4

# Создаем директории для конфигурации и контента, если их нет
RUN mkdir -p /usr/local/apache2/conf /usr/local/apache2/htdocs

# Копируем конфигурационные файлы, если они существуют
COPY ./conf/httpd.conf /usr/local/apache2/conf/httpd.conf 2>/dev/null || true

# Копируем веб-контент в контейнер, если он существует
COPY ./htdocs /usr/local/apache2/htdocs/ 2>/dev/null || true

# Создаем тестовую страницу, если контент не скопирован
RUN echo '<html><body><h1>Apache2 работает!</h1><p>Это тестовая страница, созданная по умолчанию.</p></body></html>' > /usr/local/apache2/htdocs/index.html

# Устанавливаем права доступа
RUN chown -R www-data:www-data /usr/local/apache2/htdocs

# Открываем порт 80 для веб-доступа
EXPOSE 80

# Запускаем Apache в foreground режиме
CMD ["httpd-foreground"] 
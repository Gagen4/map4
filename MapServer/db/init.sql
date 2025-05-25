-- Создание таблицы пользователей
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Users] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [Username] NVARCHAR(50) NOT NULL UNIQUE,
        [Password] NVARCHAR(255) NOT NULL,
        [CreatedAt] DATETIME DEFAULT GETDATE(),
        [LastLogin] DATETIME NULL
    )
END

-- Добавление столбца UserId в таблицу MapObjects
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[MapObjects]') AND name = 'UserId')
BEGIN
    ALTER TABLE [dbo].[MapObjects]
    ADD [UserId] INT,
    CONSTRAINT FK_MapObjects_Users FOREIGN KEY (UserId)
    REFERENCES [Users](Id)
END 
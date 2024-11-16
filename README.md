
Endpoints
1-Lista de livros com paginação. 
Get localhost:3000/api/books/getbook
 
2-Lista de users com paginação.
Get localhost:3000/api/users/getusers
 
3-Adicionar 1 ou vários livros. 
Post localhost:3000/api/books/createbooks
 
4-Adicionar 1 ou vários utilizadores. 
Post localhost:3000/api/users/createusers
 

5-Pesquisar pelo _id(books).
Get localhost:3000/api/books/searchbook/:id
 

6-Pesquisar pelo _id(users)
Get localhost:3000/api/users/user/:id
 
7-Remover livro pelo _id  
Delete localhost:3000/api/books/deletebook/:id
 
8-Remover user pelo _id 
Delete localhost:3000/api/users/deleteuser/:id
 
9-Update livro  
PUT localhost:3000/api/books/:id
 
10-Update user
 PUT localhost:3000/api/users/:id
 
11-Lista de livros com maior score (pela média), por ordem descendente.
Get localhost:3000/api/books/top/:id
 
12-Lista de livros ordenado pelo número total de reviews
:order - “asc” or “desc”
GET  localhost:3000/api/books/ratings/:asc
 
13-Lista de livros com mais 5 estrelas. Mostrar toda a informação do livro e o número de reviews igual a 5
GET localhost:3000/api/books/star
 
14-Lista de livros avaliados no ano {year}
GET localhost:3000/api/books/book/:year
 
15-Lista de livros que têm comentários. Ordenado pelo número total de comentários.
GET localhost:3000/api/books/comments
 
16-Número total de reviews por “job”
GET localhost:3000/api/users/users/job
 
Resultado deverá apresentar apenas o “job” e número de reviews
17-Lista de livros filtrada por preço, categoria e/ou autor. 
GET localhost:3000/api/books/search/categories/:category
 
18-Adicionar novo comentário a um livro
POST localhost:3000/api/comments
 
19-Remove comment by _id
Delete localhost:3000/api/comments
 
20-
20.1-Adicionar livros da lista (books.json) a cada livraria.
POST localhost:3000/api/livrarias/addbooks
 
20.2-Consultar livros numa livraria
GET localhost:3000/api/livrarias/getbook/:id
 

20.3-Lista de livrarias perto de uma localização
GET localhost:3000/api/livrarias/locatelivrarias
 

20.4-Lista de livrarias perto do caminho de uma rota
GET localhost:3000/api/livrarias/livrarias_em_rota
 
20.5-Retornar número de livrarias perto de uma localização 
GET localhost:3000/api/livrarias/countlivrarias
 
20.6-Verificar se um determinado user (Ponto) se encontra dentro da feira do livro
GET localhost:3000/api/livrarias/check-point
 


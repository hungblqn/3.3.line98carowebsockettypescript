# 3.3.line98carowebsockettypescript

Mã nguồn bao gồm server game nestjs và client react typescript, database là mongodb local (tailwindcss)
server:
setup: npm i
run: npm run start
unit test: npm test
client:
setup: npm i
run: npm run dev

sửa mongodb link trong src/app.module.ts, src/game/database.ts (phục vụ cho websocket server)

server port: 3000
client port: 5173

client route
/: register, login (chưa đăng nhập), đã đăng nhập: chuyển hướng sang /settings (đổi email, username), đăng xuất, chuyển hướng sang /line98, /caro

unit test bao gồm
/src/load.gateway.spec.ts - test 10 bot chơi cùng 1 lúc để check average latency / move, kết quả lần test gần nhất: 9.29 ms. Có thể thay đổi số lượng trong file
/src/game.gateway.spec.ts - test chức năng trò chơi line98
/src/caro.gateway.spec.ts - test chức năng trò chơi caro

https://github.com/user-attachments/assets/bdd2a463-8d15-45fc-9472-748751bf00b4

demo đăng ký đăng nhập đăng xuất 

https://github.com/user-attachments/assets/dbb6d00f-9273-4958-9f41-6bd3a3e77233

demo đổi thông tin và đăng nhập lại

https://github.com/user-attachments/assets/6a0c09c0-21e9-41a1-885b-289ff1931234

demo line98

https://github.com/user-attachments/assets/effaa66c-7572-4a90-8e6c-0cb91711e888

demo caro

https://github.com/user-attachments/assets/18bc4d41-3349-4e5e-b574-7f99f63eacbd



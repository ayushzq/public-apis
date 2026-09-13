FROM node:18
WORKDIR /app

# पहले package.json कॉपी करके डिपेंडेंसीज़ इंस्टॉल करें
COPY package*.json ./
RUN npm install

# अब बाकी सारा कोड कॉपी करें
COPY . .

# Prisma क्लाइंट जनरेट करना बहुत ज़रूरी है
RUN npx prisma generate

# पोर्ट 4000 एक्सपोज़ करें (तुम्हारा बैकएंड इसी पर चल रहा है)
EXPOSE 4000

# सर्वर स्टार्ट करने का कमांड
CMD ["node", "server.js"]

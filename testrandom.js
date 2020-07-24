
module.exports = function () {
   return new Promise((resolve, reject) => {
      let rand = Math.random() * 12;
      resolve({ value: rand });
   })
}
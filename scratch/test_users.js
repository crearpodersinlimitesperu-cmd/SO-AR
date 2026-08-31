import { getAllCompanyUsers } from './src/services/userService.js';

async function test() {
  const users = await getAllCompanyUsers();
  users.filter(u => JSON.stringify(u).toLowerCase().includes('aguirre')).forEach(u => {
      console.log(u.name || u.nombre, u.role, u.source);
  });
}
test();

const puppeteer = require('puppeteer');
const { faker } = require('@faker-js/faker');

// Simulación de correos ya registrados en la base de datos
const existingEmails = new Set(["testuser@example.com", "user1@example.com"]);

const isValidEmail = (email) => {
  const pattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  return pattern.test(email);
};

const generateRandomEmail = (isValid = true) => {
  const username = faker.internet.userName();
  const domain = isValid ? "example.com" : `invalid${faker.random.alphaNumeric()}domain.com`;
  const email = `${username}@${domain}`;

  if (!isValidEmail(email)) {
    console.log(`Error: El correo ${email} no es válido.`);
  } else if (existingEmails.has(email)) {
    console.log(`Error: El correo ${email} ya está registrado en la base de datos.`);
  }
  return email;
};

const generateRandomPassword = (isValid = true) => {
  if (isValid) {
    return faker.internet.password(14, true, /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{14,}$/);
  } else {
    return faker.string.alphanumeric(14).toLowerCase();
  }
  
};

const isValidPassword = (password) => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/.test(password);
};

const setupBrowser = async () => {
  return await puppeteer.launch({ headless: false });
};

const testCreateUser = async (fullname, email, password) => {
  const browser = await setupBrowser();
  try {
    const page = await browser.newPage();
    await page.goto('https://salinaka-ecommerce.web.app/');
    console.log("Sitio web abierto");

    const registerButton = await page.waitForSelector('a[href="/signup"]');
    await registerButton.click();
    console.log("Botón de registro encontrado y fue clickeado.");

    await page.waitForSelector('#fullname');

    // Llenando campos de registro
    await page.type('input[name="fullname"]', fullname);
    await page.type('input[name="email"]', email);
    await page.type('input[name="password"]', password);
    console.log("Campos de registro llenados");

    await page.click('.auth-button');
    console.log("Formulario enviado");

    // Verificar errores en los campos de entrada
    const emailError = await checkInputError(page, 'email');
    const passwordError = await checkInputError(page, 'password');

    if (emailError) {
      console.log(`Test Passed: Error de correo electrónico detectado: ${emailError}`);
      return;
    }
    if (passwordError) {
      console.log(`Test Passed: Error de contraseña detectado: ${passwordError}`);
      return;
    }

    // Verificación de notificación
    try {
      const notification = await page.waitForSelector('.toast-error, .toast-success', { timeout: 10000 });
      const notificationText = await notification.evaluate(el => el.textContent);

      if (notificationText.includes("Email is already in use")) {
        console.log("Test Passed: Mensaje de error encontrado; el usuario ya existe.");
      } else if (notificationText.toLowerCase().includes("successfully")) {
        console.log("Test Passed: Notificación de registro exitoso encontrada.");
        if (await checkSignOutPresent(page)) {
          console.log("Test Passed: Sign Out presente, confirmando inicio de sesión exitoso.");
        } else {
          console.log("Test Failed: Sign Out no encontrado después del registro.");
        }
      } else {
        console.log("Test Failed: Mensaje inesperado encontrado:", notificationText);
      }
    } catch (error) {
      console.log("Test Failed: No se encontró notificación de éxito o error.");
    }
  } catch (error) {
    console.log(`Error al ejecutar el test de creación de usuario: ${error}`);
  } finally {
    await browser.close();
  }
};

const checkInputError = async (page, inputName) => {
  try {
    const errorSpan = await page.$(`input[name="${inputName}"] ~ span.label-input.label-error`);
    return errorSpan ? await errorSpan.evaluate(el => el.textContent) : null;
  } catch {
    return null;
  }
};


const checkSignOutPresent = async (page) => {
  try {
    await page.click('.user-nav');
    await page.waitForXPath("//h6[contains(text(), 'Sign Out')]", { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
};

const runTests = async () => {
  console.log("Iniciando pruebas de creación de usuario...");

  // Test con usuario válido
  const fullname = faker.person.fullName();
  const email = generateRandomEmail();
  const password = generateRandomPassword();
  console.log(`Probando con usuario válido: ${email}, ${password}`);
  await testCreateUser(fullname, email, password);
  console.log("                         ");

  // Test con correo ya registrado
  console.log(`Probando con correo ya registrado: testuser@example.com`);
  await testCreateUser(fullname, "testuser@example.com", password);
  console.log("                         ");

  // Test con correo inválido
  const invalidEmail = "invalid_email@example!!!.com";
  console.log(`Probando con correo inválido: ${invalidEmail}`);
  await testCreateUser(fullname, invalidEmail, password);
  console.log("                         ");

  // Test con contraseña inválida
  const invalidPassword = generateRandomPassword(false);
  console.log(`Probando con contraseña inválida: ${invalidPassword}`);
  await testCreateUser(fullname, generateRandomEmail(), invalidPassword);
  console.log("                         ");
};

runTests();

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
    let domain = isValid ? "example.com" : `inva${faker.string.alphanumeric(3)}li${faker.string.symbol(2)}.com`;
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
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '@$!%*?&';
    const allChars = lowercase + uppercase + numbers + symbols;

    let password = '';
    password += faker.helpers.arrayElement(lowercase);
    password += faker.helpers.arrayElement(uppercase);
    password += faker.helpers.arrayElement(numbers);
    password += faker.helpers.arrayElement(symbols);

    for (let i = password.length; i < 14; i++) {
      password += faker.helpers.arrayElement(allChars);
    }

    return faker.helpers.shuffle(password.split('')).join('');
  } else {
    // Generar una contraseña inválida (sin mayúsculas)
    return 'a'.repeat(14);
  }
};

const setupBrowser = async () => {
  return await puppeteer.launch({ headless: false });
};

const checkInputError = async (page, inputName) => {
  try {
    // Buscar el div padre del input
    const inputGroup = await page.$(`div.input-group input[name="${inputName}"]`);

    if (inputGroup) {
      // Usar el input como referencia y buscar el span hermano que contiene el error
      const errorSpan = await page.$(`div.input-group input[name="${inputName}"] ~ span.label-error`);

      if (errorSpan) {
        return await page.evaluate(el => el.textContent, errorSpan);
      }
    }
    return null;
  } catch (error) {
    console.error(`Error al buscar el error del input ${inputName}:`, error);
    return null;
  }
};

// Test para crear usuario
const testCreateUser = async (fullname, email, password) => {
  const browser = await setupBrowser();
  try {
    const page = await browser.newPage();
    await page.goto('https://salinaka-ecommerce.web.app/');
    console.log("Sitio web abierto");

    const registerButton = await page.waitForSelector('a[href="/signup"]');
    await registerButton.click();
    console.log("Botón de registro encontrado y clickeado.");

    // Espera que aparezcan los campos de entrada
    await page.waitForSelector('#fullname');

    // Introduce los datos
    await page.type('input[name="fullname"]', fullname);
    await page.type('input[name="email"]', email);
    await page.type('input[name="password"]', password);
    console.log("Campos de registro llenados");

    // Enviar formulario
    await page.click('.auth-button');
    console.log("Formulario enviado");

    // Verificar errores en los campos de correo y contraseña
    const emailError = await checkInputError(page, 'email');
    const passwordError = await checkInputError(page, 'password');

    if (emailError) {
      console.log(`Test Passed: Error en el campo de correo: ${emailError}`);
    }
    if (passwordError) {
      console.log(`Test Passed: Error en el campo de contraseña: ${passwordError}`);
    }

    // Verifica si existe un mensaje de éxito o error (como notificación)
    try {
      const notification = await page.waitForSelector('.toast-error, .toast-success', { timeout: 10000 });
      const notificationText = await notification.evaluate(el => el.textContent);

      if (notificationText.includes("Email is already in use")) {
        console.log("Test Passed: Mensaje de error encontrado; el usuario ya existe.");
      } else if (notificationText.toLowerCase().includes("successfully")) {
        console.log("Test Passed: Registro exitoso.");
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

  // Test con correo inválido (caracteres especiales en el dominio)
  const invalidEmail = generateRandomEmail(false);
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

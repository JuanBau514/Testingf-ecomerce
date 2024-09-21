from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException, StaleElementReferenceException
import random
import string
import re

chrome_path = "/home/juanbaucl/Proyectos/.chromedriver-linux64/chrome"
chromedriver_path = "/home/juanbaucl/Proyectos/.chromedriver-linux64/chromedriver"

options = webdriver.ChromeOptions()
options.binary_location = chrome_path

service = Service(executable_path=chromedriver_path)

# Simulación de correos ya registrados en la base de datos
existing_emails = {"testuser@example.com", "user1@example.com"}

def generate_random_string(length=8):
    """Genera una cadena aleatoria de letras y números."""
    letters = string.ascii_letters + string.digits
    return ''.join(random.choice(letters) for _ in range(length))

def generate_random_email(is_valid=True):
    """Genera un correo aleatorio y valida su formato."""
    username = generate_random_string(8)
    if is_valid:
        domain = "example.com"
    else:
        domain = f"invalid{random.choice(string.punctuation)}domain.com"

    email = f"{username}@{domain}"

    # Validación del correo
    if not is_valid_email(email):
        print(f"Error: El correo {email} no es válido.")
    elif email in existing_emails:
        print(f"Error: El correo {email} ya está registrado en la base de datos.")
    return email

def is_valid_email(email):
    """Valida el formato del correo electrónico."""
    pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    return re.match(pattern, email) is not None

def generate_random_password(length=14, is_valid=True):
    """Genera una contraseña aleatoria cumpliendo requisitos de seguridad."""
    if is_valid:
        lowercase = string.ascii_lowercase
        uppercase = string.ascii_uppercase
        digits = string.digits
        symbols = string.punctuation
        all_chars = lowercase + uppercase + digits + symbols
        password = ''.join(random.choice(all_chars) for _ in range(length))
        
        # Asegurarse de que la contraseña cumple con todos los requisitos
        if not (any(c.islower() for c in password) and
                any(c.isupper() for c in password) and
                any(c.isdigit() for c in password) and
                any(c in symbols for c in password)):
            return generate_random_password(length, is_valid)
        
        return password
    else:
        # Genera una contraseña inválida (sin mayúsculas y solo números)
        return ''.join(random.choices(string.digits, k=length))

def is_valid_password(password):
    """Valida que la contraseña cumpla con los requisitos de seguridad."""
    return (len(password) >= 12 and
            any(c.isupper() for c in password) and
            any(c.islower() for c in password) and
            any(c.isdigit() for c in password) and
            any(c in string.punctuation for c in password))

def setup_browser():
    """Configura y devuelve una nueva instancia del navegador."""
    return webdriver.Chrome(service=service, options=options)

def test_create_user(fullname, email, password):
    browser = setup_browser()
    try:
        browser.get('https://salinaka-ecommerce.web.app/')
        print("Sitio web abierto")

        register_button = WebDriverWait(browser, 10).until(
            EC.element_to_be_clickable((By.LINK_TEXT, "Sign Up")),
        )
        print("Botón de registro encontrado y fue clickeado.")
        register_button.click()

        WebDriverWait(browser, 10).until(
            EC.presence_of_element_located((By.ID, "fullname"))
        )

        browser.find_element(By.NAME, "fullname").send_keys(fullname)
        browser.find_element(By.NAME, "email").send_keys(email)
        browser.find_element(By.NAME, "password").send_keys(password)
        print("Campos de registro llenados")

        browser.find_element(By.CLASS_NAME, "auth-button").click()
        print("Formulario enviado")

        # Verificar errores en los campos de entrada
        email_error = check_input_error(browser, "email")
        password_error = check_input_error(browser, "password")

        if email_error:
            print(f"Test Passed: Error de correo electrónico detectado: {email_error}")
            return
        if password_error:
            print(f"Test Passed: Error de contraseña detectado: {password_error}")
            return

        try:
            # Esperar por la notificación de éxito o error
            notification = WebDriverWait(browser, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".toast-error, .toast-success"))
            )
            notification_text = notification.text
            
            if "Email is already in use" in notification_text:
                print("Test Passed: Mensaje de error encontrado; el usuario ya existe.")
            elif "successfully" in notification_text.lower():
                print("Test Passed: Notificación de registro exitoso encontrada.")
                # Verificar si el Sign Out está presente
                if check_sign_out_present(browser):
                    print("Test Passed: Sign Out presente, confirmando inicio de sesión exitoso.")
                else:
                    print("Test Failed: Sign Out no encontrado después del registro.")
            else:
                print("Test Failed: Mensaje inesperado encontrado:", notification_text)

        except TimeoutException:
            print("Test Failed: No se encontró notificación de éxito o error.")

    except Exception as e:
        print(f"Error al ejecutar el test de creación de usuario: {e}")
    finally:
        browser.quit()

def check_input_error(browser, input_name):
    """Verifica si hay un mensaje de error para un campo de entrada específico."""
    try:
        error_span = browser.find_element(By.XPATH, f"//input[@name='{input_name}']/preceding-sibling::span[@class='label-input label-error']")
        return error_span.text
    except NoSuchElementException:
        return None

def check_sign_out_present(browser):
    try:
        user_menu = WebDriverWait(browser, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, ".user-nav"))
        )
        user_menu.click()

        sign_out_button = WebDriverWait(browser, 5).until(
            EC.presence_of_element_located((By.XPATH, "//h6[contains(text(), 'Sign Out')]"))
        )
        return True
    except (TimeoutException, NoSuchElementException):
        return False

def run_tests():
    # Test con usuario válido
    print("Iniciando pruebas de creación de usuario...")
    fullname = "Test User"
    email = generate_random_email()
    password = generate_random_password()
    print(f"Probando con usuario válido: {email}, {password}")
    test_create_user(fullname, email, password)
    print("                         ") 
    
    # Test con correo ya registrado
    email = "testuser@example.com"
    print(f"Probando con correo ya registrado: {email}")
    test_create_user(fullname, email, password)
    print("                         ") 


    # Test con correo inválido (caracteres especiales)
    email = "invalid_email@example!!!.com"
    print(f"Probando con correo inválido (caracteres especiales): {email}")
    test_create_user(fullname, email, password)
    print("                         ") 

    # Test con contraseña inválida
    password = generate_random_password(is_valid=False)
    email = generate_random_email()
    print(f"Probando con contraseña inválida: {password}")
    test_create_user(fullname, email, password)
    print("                         ") 

if __name__ == "__main__":
    run_tests()
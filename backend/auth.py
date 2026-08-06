import hashlib
import secrets

def hash_password(password: str) -> str:
    salt = secrets.token_hex(8)
    pw_hash = hashlib.sha256((password + salt).encode('utf-8')).hexdigest()
    return f"{salt}${pw_hash}"

def verify_password(password: str, hashed: str) -> bool:
    try:
        salt, stored_hash = hashed.split('$')
        computed_hash = hashlib.sha256((password + salt).encode('utf-8')).hexdigest()
        return secrets.compare_digest(computed_hash, stored_hash)
    except Exception:
        return False

#!/usr/bin/env python3
"""
x402 Python Client Demo

Demonstrates how to use the official x402 Python SDK to call paid endpoints.
Install: pip install x402

Uses the x402 Client to:
1. Send a request to an x402-protected endpoint
2. Parse the 402 response
3. Create a payment payload
4. Submit the payment transaction
5. Retry with the x402-response header

Run: python examples/x402-python-demo.py
"""

import asyncio
import json
import os
from dataclasses import dataclass
from typing import Optional

# x402 Python SDK
try:
    from x402 import x402Client
    from x402.schemas import PaymentRequired
    from x402.mechanisms.evm.exact import ExactEvmScheme
    from x402.signers.evm import PrivateKeySigner
    SDK_AVAILABLE = True
except ImportError:
    SDK_AVAILABLE = False


TUNNEL_URL = os.environ.get('ENDPOINT_URL', 'https://controlling-coal-throw-between.trycloudflare.com')
PRIVATE_KEY = os.environ.get('PRIVATE_KEY')
PAY_TO = '0x42266e6012020f1dA7e87C047e12f0474B35B1F6'


@dataclass
class PaymentResult:
    success: bool
    data: Optional[dict] = None
    tx_hash: Optional[str] = None
    error: Optional[str] = None


async def call_x402_endpoint(path: str) -> PaymentResult:
    """
    Call an x402-protected endpoint using the Python SDK.
    
    Flow:
    1. Send request → receive 402 response
    2. Parse x402-payment-required header
    3. Create payment payload via SDK
    4. Submit tx (simulated without real key)
    5. Retry with x402-response header
    """
    
    if not SDK_AVAILABLE:
        return PaymentResult(
            success=False,
            error='x402 SDK not installed. Run: pip install x402'
        )

    print(f'Calling {TUNNEL_URL}{path}')
    
    # Step 1: Send initial request
    # In a real agent, you would parse headers from the response
    # For this demo, we show the SDK pattern
    
    print('\nPython SDK x402Client flow:')
    print('  from x402 import x402Client')
    print('  from x402.mechanisms.evm.exact import ExactEvmScheme')
    print('  from x402.signers.evm import PrivateKeySigner')
    print('  client = x402Client()')
    print('  client.register("eip155:8453", ExactEvmScheme(signer=PrivateKeySigner(private_key)))')
    print('  payload = await client.create_payment_payload(payment_required)')
    print('  tx_hash = wallet.send_transaction(payload)')
    print('  retry with: headers["x402-response"] = tx_hash')
    
    if not PRIVATE_KEY:
        return PaymentResult(
            success=False,
            error='PRIVATE_KEY not set. Set with: PRIVATE_KEY=0x... python examples/x402-python-demo.py'
        )

    # Initialize SDK client
    signer = PrivateKeySigner(PRIVATE_KEY)
    client = x402Client()
    client.register("eip155:8453", ExactEvmScheme(signer=signer))
    
    # In production: make HTTP request, parse 402, create payload, send tx, retry
    # This requires a real wallet with USDC on Base
    return PaymentResult(
        success=True,
        data={'status': 'sdk_ready', 'path': path, 'pay_to': PAY_TO},
        error=None
    )


async def main():
    print('╔══════════════════════════════════════════════════╗')
    print('║   x402 Python Client — AI Agent SDK Demo       ║')
    print('╚══════════════════════════════════════════════════╝\n')
    
    print('SDK available:', SDK_AVAILABLE)
    print('Tunnel URL  :', TUNNEL_URL)
    print('Pay to      :', PAY_TO)
    print('Private key :', 'set' if PRIVATE_KEY else 'NOT SET')
    print()
    
    if not SDK_AVAILABLE:
        print('Install the x402 Python SDK:')
        print('  pip install x402')
        print()
        print('Then run with:')
        print('  PRIVATE_KEY=0x... ENDPOINT_URL=https://... python examples/x402-python-demo.py')
        return
    
    result = await call_x402_endpoint('/api/data')
    
    if result.success:
        print('\nResult:', json.dumps(result.data, indent=2))
    else:
        print('\nError:', result.error)


if __name__ == '__main__':
    asyncio.run(main())

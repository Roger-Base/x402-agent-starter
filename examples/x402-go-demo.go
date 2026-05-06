// x402 Go Client Demo
//
// Demonstrates how to use the official x402 Go SDK to call paid endpoints.
// Install: go get github.com/x402-foundation/x402/go
//
// Run: PRIVATE_KEY=0x... ENDPOINT_URL=https://... go run examples/x402-go-demo.go
//
// Flow:
//  1. Create signer from private key
//  2. Create x402 client and register EVM scheme
//  3. Wrap HTTP client with x402 payment middleware
//  4. Make requests — payments handled automatically
//
// The x402 Go SDK handles: 402 detection → payment creation → retry → proof
package main

import (
	"fmt"
	"net/http"
	"os"

	x402 "github.com/x402-foundation/x402/go"
	x402http "github.com/x402-foundation/x402/go/http"
	evm "github.com/x402-foundation/x402/go/mechanisms/evm/exact/client"
	evmsigners "github.com/x402-foundation/x402/go/signers/evm"
)

const (
	tunnelURL = "https://webcams-log-under-general.trycloudflare.com"
	payTo     = "0x42266e6012020f1dA7e87C047e12f0474B35B1F6"
)

func main() {
	privateKey := os.Getenv("PRIVATE_KEY")
	endpointURL := os.Getenv("ENDPOINT_URL")
	if endpointURL == "" {
		endpointURL = tunnelURL
	}

	fmt.Println("╔══════════════════════════════════════════════════╗")
	fmt.Println("║   x402 Go Client — AI Agent SDK Demo            ║")
	fmt.Println("╚══════════════════════════════════════════════════╝")
	fmt.Println()
	fmt.Println("SDK: github.com/x402-foundation/x402/go")
	fmt.Println("Pay to:", payTo)
	fmt.Println()

	if privateKey == "" {
		fmt.Println("PRIVATE_KEY not set.")
		fmt.Println("Run with: PRIVATE_KEY=0x... go run examples/x402-go-demo.go")
		fmt.Println()
		fmt.Println("Go client flow:")
		fmt.Println("  signer, _ := evmsigners.NewClientSignerFromPrivateKey(privateKey)")
		fmt.Println("  client := x402.Newx402Client().Register(\"eip155:*\", evm.NewExactEvmScheme(signer, nil))")
		fmt.Println("  httpClient := x402http.WrapHTTPClientWithPayment(http.DefaultClient, x402http.Newx402HTTPClient(client))")
		fmt.Println("  resp, _ := httpClient.Get(endpointURL + \"/api/data\")")
		return
	}

	// 1. Create signer from private key
	signer, err := evmsigners.NewClientSignerFromPrivateKey(privateKey)
	if err != nil {
		fmt.Printf("Signer error: %v\n", err)
		return
	}

	// 2. Create x402 client and register EVM scheme for Base
	client := x402.Newx402Client().
		Register("eip155:8453", evm.NewExactEvmScheme(signer, nil)) // Base Mainnet

	// 3. Wrap HTTP client with x402 payment middleware
	httpClient := x402http.WrapHTTPClientWithPayment(
		http.DefaultClient,
		x402http.Newx402HTTPClient(client),
	)

	// 4. Make requests — payments handled automatically
	// The wrapped client: detects 402 → creates payment → retries with proof
	resp, err := httpClient.Get(endpointURL + "/api/data")
	if err != nil {
		fmt.Printf("Request error: %v\n", err)
		return
	}
	defer resp.Body.Close()

	fmt.Printf("Response: %d %s\n", resp.StatusCode, resp.Status)
	fmt.Println("x402 payment flow completed successfully.")
}

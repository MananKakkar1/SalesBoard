package main

import (
	"flag"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

func main() {
	url := flag.String("url", "http://localhost:8080/api/orders", "endpoint to hit")
	concurrency := flag.Int("c", 32, "concurrent clients")
	duration := flag.Duration("d", 30*time.Second, "test duration")
	flag.Parse()

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	var latencies []time.Duration
	var latMu sync.Mutex
	var wg sync.WaitGroup

	stop := time.Now().Add(*duration)

	worker := func() {
		defer wg.Done()
		for time.Now().Before(stop) {
			start := time.Now()
			resp, err := client.Get(*url)
			if err == nil {
				io.Copy(io.Discard, resp.Body)
				resp.Body.Close()
			}
			elapsed := time.Since(start)

			latMu.Lock()
			latencies = append(latencies, elapsed)
			latMu.Unlock()
		}
	}

	wg.Add(*concurrency)
	for i := 0; i < *concurrency; i++ {
		go worker()
	}
	wg.Wait()

	// summarize
	if len(latencies) == 0 {
		fmt.Println("no samples")
		return
	}
	// copy & sort
	s := make([]time.Duration, len(latencies))
	copy(s, latencies)
	// simple insertion sort (n is small enough for 30s run)
	for i := 1; i < len(s); i++ {
		j := i
		for j > 0 && s[j] < s[j-1] {
			s[j], s[j-1] = s[j-1], s[j]
			j--
		}
	}

	sum := time.Duration(0)
	for _, v := range s {
		sum += v
	}
	p50 := s[len(s)/2]
	p95 := s[int(float64(len(s))*0.95)]
	throughput := float64(len(s)) / duration.Seconds()

	fmt.Printf("URL: %s\n", *url)
	fmt.Printf("Requests: %d in %s\n", len(s), *duration)
	fmt.Printf("Throughput: %.1f req/s\n", throughput)
	fmt.Printf("Latency p50: %s  p95: %s  max: %s\n", p50, p95, s[len(s)-1])
}

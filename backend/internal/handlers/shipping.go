package handlers

import "math"

// Haversine distance in kilometers
func haversineKm(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371.0 // km
	rad := func(d float64) float64 { return d * math.Pi / 180.0 }
	dLat := rad(lat2 - lat1)
	dLon := rad(lon2 - lon1)
	alat1 := rad(lat1)
	alat2 := rad(lat2)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(alat1)*math.Cos(alat2)*math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

// Linear shipping model: base + rate_per_km * distance * weight_factor
type ShipParams struct {
	BasePerShipment float64 // e.g. 2.00
	RatePerKm       float64 // e.g. 0.50
	WeightFactor    float64 // multiply by product weight (leave 1.0 if not used)
}

func shippingCostKm(base, ratePerKm, km, weight float64) float64 {
	w := weight
	if w <= 0 {
		w = 1
	}
	return base + ratePerKm*km*w
}

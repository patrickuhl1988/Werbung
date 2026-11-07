extends SceneTree

func _initialize() -> void:
	call_deferred("run_test")

func run_test() -> void:
	var promo=load("res://scripts/promo.gd").new()
	root.add_child(promo)
	promo.webview=RefCounted.new()
	var data=JSON.parse_string(FileAccess.get_file_as_string("res://qa/promo-v1/kettro-werbe-config.json"))
	assert(promo.apply_remote(data))
	assert(promo.rewarded_pool().size()==2)
	var counts={"app.arrowpuzzle":0,"com.patrickuhl.sortrush":0}
	for i in 1000:
		var c=promo.choose_rewarded((i+.5)/1000.0)
		counts[c.android]+=1
	assert(counts["app.arrowpuzzle"]==500 and counts["com.patrickuhl.sortrush"]==500)
	assert(promo.choose_rewarded(.499).android=="app.arrowpuzzle")
	assert(promo.choose_rewarded(.5).android=="com.patrickuhl.sortrush")
	# A package cannot point at a different game's playable or an untrusted host.
	for c in promo.remote_creatives:
		if c.android=="com.patrickuhl.sortrush":
			c.portrait.src="https://example.com/ad.html"
			c.landscape.src="https://example.com/ad.html"
	assert(promo.rewarded_pool().size()==1)
	promo.webview=null
	assert(promo.rewarded_pool().is_empty())
	print("PROMO_ROTATION_PASS: equal 50:50 intervals, package mapping, host restriction, no-WebView fallback")
	promo.queue_free()
	quit()
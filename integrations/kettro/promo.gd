class_name HeistPromo
extends CanvasLayer

# Godot adapter of the studio's Werbemodul: full-screen self-promotion for our own games.
# Sources, in this order:
#  1. the per-app remote config (CONFIG_URL, same JSON as the web/RN adapters), cached in
#     user:// so it also works offline after the first fetch; it defines the creatives and
#     the `rewarded.selectedIds` used for rewarded placements (revive, double reward);
#  2. the bundled image catalog (assets/promo/catalog.json) as offline/desktop fallback.
# A creative with media type `playable` is an HTML file served from PLAYABLE_BASE (GitHub Pages:
# jsDelivr sends HTML as text/plain with nosniff, a WebView would show the source code) and
# runs in the Android WebView plugin (addons/werbemodul_webview); it talks to us by posting JSON
# through `window.ReactNativeWebView.postMessage`: `wm:ready` (drawn), `wm:cta` (open the
# store), `wm:cleared` (solved). Without the plugin, or when the page fails or stays silent,
# the bundled image creative takes its place, so the offer never dies on a load failure.
# Reward gating: `on_done` runs only in `finish()`, which needs something really displayed
# (`displayed`) and the unlocked "continue" tap. No tracking, no impression upload.
const CONFIG_URL:="https://cdn.jsdelivr.net/gh/patrickuhl1988/Werbung@main/config/kettro-werbe-config.json"
const MEDIA_BASE:="https://cdn.jsdelivr.net/gh/patrickuhl1988/Werbung@main/"
const PLAYABLE_BASE:="https://patrickuhl1988.github.io/Werbung/"
const CACHE_PATH:="user://werbe-config.json"
const PLUGIN_NAME:="WerbemodulWebView"
const ARROW_PACKAGE:="app.arrowpuzzle"
const ARROW_PLAYABLE:="playables/arrow-puzzle-fox.html"
const SORT_PACKAGE:="com.patrickuhl.sortrush"
const SORT_PLAYABLE:="playables/sort-rush.html"
const READY_TIMEOUT:=8.0
var game
var creatives:Array=[]            # bundled image catalog (offline fallback)
var remote:Dictionary={}          # last remote config (cached or fetched)
var remote_creatives:Array=[]     # creatives from the remote config, normalised
var rewarded_ids:Array=[]
var enabled:=true
var unlock_seconds:=5.0
var per_ad_unlock:Dictionary={}
var index:=0
var remaining:=0.0
var on_done:Callable
var placement:=""
var current:Dictionary={}
var rendered_as:=""               # "", "playable" or "image"
var displayed:=false              # the player really saw something; only then may finish() pay out
var ready_wait:=0.0
var webview=null                  # Android plugin singleton or a test double
var store_url:=""
var config_source:="bundled"      # "bundled", "cache" or "remote"
var last_size:=Vector2.ZERO
var http:HTTPRequest
var panel:Control
var band:ColorRect
var bottom:VBoxContainer
var picture:TextureRect
var icon:TextureRect
var accent:ColorRect
var title:Label
var tagline:Label
var continue_button:Button
var store_button:Button

func setup(owner_game) -> void:
	game=owner_game;layer=30
	var file:=FileAccess.open("res://assets/promo/catalog.json",FileAccess.READ)
	if file:
		var data=JSON.parse_string(file.get_as_text())
		if data is Dictionary:
			for c in data.get("creatives",[]):
				if c is Dictionary and c.get("android")==ARROW_PACKAGE:creatives.append(c)
			unlock_seconds=float(data.get("unlock_seconds",5))
	panel=ColorRect.new();add_child(panel);panel.color=Color(.01,.03,.05,.96)
	panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT);panel.mouse_filter=Control.MOUSE_FILTER_STOP
	picture=TextureRect.new();panel.add_child(picture)
	picture.expand_mode=TextureRect.EXPAND_IGNORE_SIZE;picture.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	picture.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	# The caption band below the picture: text and buttons never cover the creative's own art.
	band=ColorRect.new();panel.add_child(band);band.color=Color(.02,.05,.07,1)
	band.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	bottom=VBoxContainer.new();panel.add_child(bottom);bottom.add_theme_constant_override("separation",8)
	bottom.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE);bottom.offset_left=24;bottom.offset_right=-24;bottom.offset_bottom=-24
	accent=ColorRect.new();bottom.add_child(accent);accent.custom_minimum_size=Vector2(0,4);accent.color=Color.WHITE
	var head:=HBoxContainer.new();bottom.add_child(head);head.alignment=BoxContainer.ALIGNMENT_CENTER;head.add_theme_constant_override("separation",12)
	icon=TextureRect.new();head.add_child(icon);icon.custom_minimum_size=Vector2(44,44)
	icon.expand_mode=TextureRect.EXPAND_IGNORE_SIZE;icon.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	title=Label.new();head.add_child(title);title.add_theme_font_size_override("font_size",30);title.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	tagline=Label.new();bottom.add_child(tagline);tagline.add_theme_font_size_override("font_size",17)
	tagline.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER;tagline.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	for label in [title,tagline]:
		label.add_theme_color_override("font_shadow_color",Color.BLACK);label.add_theme_constant_override("shadow_offset_y",2)
	var row:=HBoxContainer.new();bottom.add_child(row);row.alignment=BoxContainer.ALIGNMENT_CENTER;row.add_theme_constant_override("separation",12)
	store_button=game.ui.button(row,"",open_store);store_button.custom_minimum_size=Vector2(200,54)
	continue_button=game.ui.button(row,"",finish,true);continue_button.custom_minimum_size=Vector2(200,54)
	var tag:=Label.new();panel.add_child(tag);tag.position=Vector2(16,14);tag.add_theme_font_size_override("font_size",13)
	tag.text="UHL STUDIOS";tag.modulate=Color(1,1,1,.7)
	hide()
	if Engine.has_singleton(PLUGIN_NAME):attach_webview(Engine.get_singleton(PLUGIN_NAME))
	load_cached_config()
	if not game.qa_mode:fetch_config()

# ───────────────────────── remote config ─────────────────────────

func load_cached_config() -> void:
	if not FileAccess.file_exists(CACHE_PATH):return
	if apply_remote(JSON.parse_string(FileAccess.get_file_as_string(CACHE_PATH))):config_source="cache"

func fetch_config() -> void:
	if http!=null:return
	http=HTTPRequest.new();add_child(http);http.timeout=12
	http.request_completed.connect(_on_config_fetched)
	if http.request(CONFIG_URL)!=OK:http.queue_free();http=null

func _on_config_fetched(result:int,code:int,_headers:PackedStringArray,body:PackedByteArray) -> void:
	http.queue_free();http=null
	if result!=HTTPRequest.RESULT_SUCCESS or code!=200:return
	var text:=body.get_string_from_utf8()
	var data=JSON.parse_string(text)
	if apply_remote(data):
		config_source="remote"
		var file:=FileAccess.open(CACHE_PATH,FileAccess.WRITE)
		if file:file.store_string(text);file.close()

# Takes the module's remote JSON (`config`, `creatives`, `rewarded`). Returns false for junk.
func apply_remote(data) -> bool:
	if not data is Dictionary:return false
	remote=data
	var cfg=data.get("config",{})
	if cfg is Dictionary:
		enabled=bool(cfg.get("enabled",true))
		unlock_seconds=clampf(float(cfg.get("defaultUnlockSeconds",unlock_seconds)),0,600)
		per_ad_unlock={}
		if bool(cfg.get("advancedTimings",false)) and cfg.get("perAdUnlockSeconds") is Dictionary:
			per_ad_unlock=cfg.perAdUnlockSeconds
	remote_creatives=[]
	for c in data.get("creatives",[]):
		if not c is Dictionary or not c.has("id"):continue
		var media=c.get("media",{})
		if not media is Dictionary:media={}
		var target=c.get("target",{})
		if not target is Dictionary or target.get("android") not in [ARROW_PACKAGE,SORT_PACKAGE]:continue
		remote_creatives.append({"id":String(c.id),"title":c.get("title",{"en":String(c.id)}),"tagline":c.get("tagline",{"en":""}),
			"icon":String(c.get("icon","")),"accent":String(c.get("accent","")),"android":String(target.android),
			"portrait":media.get("portrait",media.get("landscape",{})),"landscape":media.get("landscape",media.get("portrait",{}))})
	rewarded_ids=[]
	var rewarded=data.get("rewarded",{})
	if rewarded is Dictionary:
		for id in rewarded.get("selectedIds",[]):rewarded_ids.append(String(id))
	return true

func find_remote(id:String) -> Dictionary:
	for c in remote_creatives:
		if c.id==id:return c
	return {}

func unlock_for(id:String) -> float:
	return clampf(float(per_ad_unlock[id]),0,600) if per_ad_unlock.has(id) else unlock_seconds

# ───────────────────────── creatives and media ─────────────────────────

func available() -> bool:return not creatives.is_empty()

func creative() -> Dictionary:return current if not current.is_empty() else (creatives[index%creatives.size()] if available() else {})

func portrait() -> bool:
	var size:=get_viewport().get_visible_rect().size
	return size.y>=size.x

func media_of(c:Dictionary) -> Dictionary:
	var m=c.get("portrait" if portrait() else "landscape")
	if m is Dictionary:return m
	if m is String and m!="":return {"type":"image","src":String(m)}
	return {}

func media_url(src:String) -> String:
	if src.begins_with("http://") or src.begins_with("https://"):return src
	if src.begins_with("playables/"):return PLAYABLE_BASE+src
	if src.begins_with("videos/") or src.begins_with("images/") or src.begins_with("posters/"):return MEDIA_BASE+src
	return "res://assets/promo/"+src

func image_path(c:Dictionary) -> String:
	var m:=media_of(c)
	return media_url(String(m.get("src",""))) if m.get("type","")=="image" else ""

# Bundled image creatives only; remote images are not downloaded in this version.
func can_show_image(c:Dictionary) -> bool:
	var path:=image_path(c)
	return path.begins_with("res://") and ResourceLoader.exists(path)

func image_fallback_index() -> int:
	if not available():return -1
	for k in creatives.size():
		if can_show_image(creatives[(index+k)%creatives.size()]):return (index+k)%creatives.size()
	return -1

func playable_available() -> bool:return webview!=null and enabled

# Pure eligibility check: probing availability never consumes a random choice.
func rewarded_pool() -> Array:
	var pool:Array=[]
	if not playable_available():return pool
	for id in rewarded_ids:
		var c:=find_remote(id)
		if c.is_empty():continue
		var media:=media_of(c)
		var expected:=SORT_PLAYABLE if c.android==SORT_PACKAGE else ARROW_PLAYABLE
		if media.get("type")=="playable" and media_url(String(media.get("src","")))==PLAYABLE_BASE+expected and not pool.has(c):pool.append(c)
	return pool

func rewarded_creative() -> Dictionary:
	var pool:=rewarded_pool()
	return pool[0] if not pool.is_empty() else {}

func choose_rewarded(sample:float) -> Dictionary:
	var pool:=rewarded_pool()
	if pool.is_empty():return {}
	return pool[clampi(int(sample*pool.size()),0,pool.size()-1)]

# True when a rewarded block can actually appear: a playable with the WebView, or a bundled image.
func can_show_reward() -> bool:
	return not rewarded_creative().is_empty() or image_fallback_index()>=0

# Rewarded block. Returns false (and never calls `done`) when nothing can be shown;
# the caller must then withhold the reward.
func show_reward(done:Callable,which:String) -> bool:
	if visible:return false
	var c:=choose_rewarded(randf())
	if not c.is_empty():return begin_playable(c,done,which)
	var i:=image_fallback_index()
	if i<0:return false
	index=i
	return show_creative(done,which)

# Shows the bundled creative at `index`; `done` runs only after the unlocked "continue" tap.
func show_creative(done:Callable,which:String="") -> bool:
	if not available() or visible:return false
	var c:Dictionary=creatives[index%creatives.size()]
	if not can_show_image(c):
		push_warning("Promo image missing: "+image_path(c));return false
	var texture=load(image_path(c))
	if texture==null:return false
	on_done=done;placement=which
	present(c,"image");picture.texture=texture
	mark_displayed()
	return true

func begin_playable(c:Dictionary,done:Callable,which:String) -> bool:
	var url:=media_url(String(media_of(c).get("src","")))
	if url=="" or not url.begins_with("http"):return false
	on_done=done;placement=which
	present(c,"playable");picture.texture=null;ready_wait=READY_TIMEOUT
	place_webview()
	webview.show(url,webview_rect().position.x,webview_rect().position.y,webview_rect().size.x,webview_rect().size.y)
	return true

# Common overlay state for a creative; nothing is displayed yet.
func present(c:Dictionary,kind:String) -> void:
	current=c;rendered_as=kind;displayed=false;remaining=unlock_for(String(c.id));store_url=""
	var lang:String=game.words.lang
	var icon_src:=String(c.get("icon",""))
	var icon_path:=media_url(icon_src) if icon_src!="" else ""
	icon.texture=load(icon_path) if icon_path.begins_with("res://") and ResourceLoader.exists(icon_path) else null
	icon.visible=icon.texture!=null
	var hex:=String(c.get("accent",""))
	accent.color=Color.html(hex) if hex!="" and Color.html_is_valid(hex) else Color(1,1,1,.35)
	var t=c.get("title",{});var g=c.get("tagline",{})
	title.text=String(t.get(lang,t.get("en",""))) if t is Dictionary else String(t)
	tagline.text=String(g.get(lang,g.get("en",""))) if g is Dictionary else String(g)
	store_button.text=game.words.text("promo_open")
	last_size=get_viewport().get_visible_rect().size;layout();show();refresh()

# Something is really on screen (image set, or the playable sent `wm:ready`): the countdown may run.
func mark_displayed() -> void:
	if displayed:return
	displayed=true;refresh()

# The playable could not be shown: hide the WebView and show a bundled image instead, so
# the player still gets the offer. With no image either, the block closes without reward.
func fallback_to_image() -> void:
	if rendered_as!="playable" or not visible:return
	hide_webview()
	var i:=image_fallback_index()
	if i<0:cancel();return
	index=i
	var c:Dictionary=creatives[i]
	var kept_done:=on_done;var kept_place:=placement
	present(c,"image");on_done=kept_done;placement=kept_place
	picture.texture=load(image_path(c));mark_displayed()

func cancel() -> void:
	hide_webview();hide();current={};rendered_as="";displayed=false;on_done=Callable();placement=""

# ───────────────────────── WebView bridge (Android plugin or test double) ─────────────────────────

func attach_webview(obj) -> void:
	webview=obj
	for spec in [["message",_on_webview_message],["page_loaded",_on_webview_loaded],["page_failed",_on_webview_failed]]:
		if obj.has_signal(spec[0]) and not obj.is_connected(spec[0],spec[1]):obj.connect(spec[0],spec[1])

func _on_webview_message(text:String) -> void:
	if rendered_as!="playable" or not visible:return
	var msg=JSON.parse_string(text)
	if not msg is Dictionary:return
	match String(msg.get("type","")):
		"wm:ready":mark_displayed()
		"wm:cta":open_store()
		"wm:cleared":game.audio.effect("extract",.8)

# A finished load proves nothing: a page delivered as text "loads" fine and shows source code.
# Only the playable's own `wm:ready` counts; silence ends in the image fallback (READY_TIMEOUT).
func _on_webview_loaded(_url:String) -> void:
	pass

func _on_webview_failed(_reason:String) -> void:
	if rendered_as=="playable" and visible and not displayed:fallback_to_image()

func webview_rect() -> Rect2i:
	var size:=get_viewport().get_visible_rect().size
	var height:=236.0 if portrait() else 168.0
	var rect:Rect2=get_viewport().get_final_transform()*Rect2(0,0,size.x,size.y-height)
	return Rect2i(rect.position.round(),rect.size.round())

func place_webview() -> void:
	if webview!=null and webview.has_method("setRect"):
		var r:=webview_rect();webview.setRect(r.position.x,r.position.y,r.size.x,r.size.y)

func hide_webview() -> void:
	if webview!=null and rendered_as=="playable":webview.hide()

# ───────────────────────── overlay ─────────────────────────

# Picture above, caption band below; the band is lower in landscape so the picture keeps room.
func layout() -> void:
	var height:=236.0 if portrait() else 168.0
	picture.offset_bottom=-height;picture.visible=rendered_as!="playable"
	band.offset_top=-height
	bottom.offset_top=-height+(16 if portrait() else 10)
	title.add_theme_font_size_override("font_size",30 if portrait() else 24)
	tagline.add_theme_font_size_override("font_size",17 if portrait() else 15)
	icon.custom_minimum_size=Vector2(44,44) if portrait() else Vector2(32,32)

func refresh() -> void:
	continue_button.disabled=remaining>0 or not displayed
	continue_button.text=game.words.text("promo_wait") % ceili(remaining) if remaining>0 else game.words.text("promo_continue")

func _process(delta:float) -> void:
	if not visible:return
	# Relayout only on a real size change (rotation); per-frame theme overrides would churn the UI.
	var size:=get_viewport().get_visible_rect().size
	if size!=last_size:
		last_size=size;layout()
		if rendered_as=="playable":place_webview()
	if rendered_as=="playable":
		if not displayed:
			ready_wait-=delta
			if ready_wait<=0:fallback_to_image()
			return
	if remaining<=0:return
	remaining=maxf(0,remaining-delta);refresh()

func open_store() -> void:
	var id:=String(current.get("android",""))
	if id=="":return
	store_url="https://play.google.com/store/apps/details?id="+id
	if not game.qa_mode:OS.shell_open(store_url)

func finish() -> void:
	if remaining>0 or not visible or not displayed:return
	hide_webview();hide()
	if rendered_as=="image":index+=1
	var done:=on_done;on_done=Callable();placement="";current={};rendered_as="";displayed=false
	if done.is_valid():done.call()
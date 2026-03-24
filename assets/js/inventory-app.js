/**
 * Inventory App — REST API + localStorage fallback. Κατηγορία, μάρκα, πολλαπλές φωτογραφίες, CSV, εκτύπωση/PDF, στατιστικά.
 */
(function () {
	'use strict';

	const STORAGE_ITEMS = 'general_theme_inventory_v2_items';
	const STORAGE_TAGS = 'general_theme_inventory_v2_tag_catalog';
	const STORAGE_CATEGORIES = 'general_theme_inventory_v2_categories';

	const GRADES = ['A+', 'A', 'B', 'C', 'D', 'AS-IS', 'Unknown'];

	const FUNCTIONAL_OPTIONS = [
		{ value: 'yes', label: 'Λειτουργεί' },
		{ value: 'no', label: 'Δεν λειτουργεί' },
		{ value: 'unknown', label: 'Άγνωστο' },
	];
	function getFunctionalLabel( v ) {
		var o = FUNCTIONAL_OPTIONS.find( function ( x ) { return x.value === v; } );
		return o ? o.label : 'Αγνωστο';
	}

	function noAccent( s ) {
		if ( ! s ) return s;
		var map = { 'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω', 'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ό': 'Ο', 'Ύ': 'Υ', 'Ώ': 'Ω', 'ϊ': 'ι', 'ϋ': 'υ' };
		return String( s ).replace( /[άέήίόύώΆΈΉΊΌΎΏϊϋ]/g, function ( c ) { return map[c] || c; } );
	}

	const DEFAULT_TAGS = [
		'Χρήζει format',
		'Έλεγχος μπαταρίας',
		'Γνήσιο κουτί',
		'Refurbished',
		'Για ανταλλακτικά',
	];

	const DEFAULT_CATEGORIES = [
		'Υπολογιστής',
		'Οθόνη',
		'Κονσόλα τηλεφώνου',
		'Τηλέφωνο',
		'Tablet',
		'Αξεσουάρ',
		'Άλλο',
	];

	const config = typeof window.generalThemeInventory !== 'undefined' ? window.generalThemeInventory : {};
	const apiBase = config.restUrl || '';
	const apiNonce = config.restNonce || '';
	const useApi = Boolean( apiBase && config.isLoggedIn );

	function uid() {
		return 'inv_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
	}

	function apiFetch( path, options ) {
		if ( ! apiBase ) return Promise.reject( new Error( 'No API' ) );
		const url = apiBase.replace( /\/$/, '' ) + path;
		const opts = Object.assign(
			{
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': apiNonce,
				},
			},
			options
		);
		if ( opts.body && typeof opts.body === 'object' && ! ( opts.body instanceof FormData ) && ! ( opts.body instanceof Blob ) ) {
			opts.body = JSON.stringify( opts.body );
		}
		return fetch( url, opts ).then( function ( res ) {
			if ( ! res.ok ) return Promise.reject( new Error( res.statusText ) );
			return res.json();
		} );
	}

	function loadItemsFromStorage() {
		try {
			const raw = localStorage.getItem( STORAGE_ITEMS );
			if ( ! raw ) return [];
			const data = JSON.parse( raw );
			return Array.isArray( data ) ? data : [];
		} catch ( e ) {
			return [];
		}
	}

	function loadItems() {
		if ( useApi ) {
			return apiFetch( 'inventory/items' )
				.then( function ( data ) {
					return Array.isArray( data ) ? data.map( normalizeItem ) : [];
				} )
				.catch( function () {
					return loadItemsFromStorage();
				} );
		}
		return Promise.resolve( loadItemsFromStorage() );
	}

	function normalizeItem( it ) {
		const photos = it.photo_urls || it.photos || ( it.photo ? [ it.photo ] : [] );
		var func = it.functional;
		if ( func === true || func === '1' || func === 'yes' ) func = 'yes';
		else if ( func === false || func === '0' || func === 'no' ) func = 'no';
		else if ( func !== 'yes' && func !== 'no' && func !== 'unknown' ) func = 'unknown';
		return {
			id: String( it.id ),
			name: it.name || '',
			quantity: Math.max( 0, parseInt( it.quantity, 10 ) || 0 ),
			serial: it.serial || '',
			functional: func,
			grade: GRADES.indexOf( it.grade ) >= 0 ? it.grade : 'Unknown',
			tags: Array.isArray( it.tags ) ? it.tags : [],
			category: it.category || '',
			brand: it.brand || '',
			specs: it.specs || '',
			photo_ids: Array.isArray( it.photo_ids ) ? it.photo_ids : [],
			photos: photos,
		};
	}

	function saveItemsToStorage( items ) {
		localStorage.setItem( STORAGE_ITEMS, JSON.stringify( items ) );
	}

	function loadTagCatalogFromStorage() {
		try {
			const raw = localStorage.getItem( STORAGE_TAGS );
			if ( ! raw ) return [].concat( DEFAULT_TAGS );
			const data = JSON.parse( raw );
			return Array.isArray( data ) ? data : [].concat( DEFAULT_TAGS );
		} catch ( e ) {
			return [].concat( DEFAULT_TAGS );
		}
	}

	function loadTagCatalog() {
		if ( useApi ) {
			return apiFetch( 'inventory/tags' )
				.then( function ( data ) {
					return Array.isArray( data ) ? data : [].concat( DEFAULT_TAGS );
				} )
				.catch( function () {
					return loadTagCatalogFromStorage();
				} );
		}
		return Promise.resolve( loadTagCatalogFromStorage() );
	}

	function saveTagCatalog( tags ) {
		const sorted = [].concat( tags ).filter( Boolean ).sort( function ( a, b ) {
			return a.localeCompare( b, 'el' );
		} );
		if ( useApi ) {
			return apiFetch( 'inventory/tags', { method: 'POST', body: { tags: sorted } } )
				.then( function () { return sorted; } )
				.catch( function () {
					localStorage.setItem( STORAGE_TAGS, JSON.stringify( sorted ) );
					return sorted;
				} );
		}
		localStorage.setItem( STORAGE_TAGS, JSON.stringify( sorted ) );
		return Promise.resolve( sorted );
	}

	function loadCategoryCatalogFromStorage() {
		try {
			const raw = localStorage.getItem( STORAGE_CATEGORIES );
			if ( ! raw ) return [].concat( DEFAULT_CATEGORIES );
			const data = JSON.parse( raw );
			return Array.isArray( data ) ? data : [].concat( DEFAULT_CATEGORIES );
		} catch ( e ) {
			return [].concat( DEFAULT_CATEGORIES );
		}
	}

	function loadCategoryCatalog() {
		if ( useApi ) {
			return apiFetch( 'inventory/categories' )
				.then( function ( data ) {
					return Array.isArray( data ) ? data : [].concat( DEFAULT_CATEGORIES );
				} )
				.catch( function () {
					return loadCategoryCatalogFromStorage();
				} );
		}
		return Promise.resolve( loadCategoryCatalogFromStorage() );
	}

	function saveCategoryCatalog( categories ) {
		const sorted = [].concat( categories ).filter( Boolean ).sort( function ( a, b ) {
			return a.localeCompare( b, 'el' );
		} );
		if ( useApi ) {
			return apiFetch( 'inventory/categories', { method: 'POST', body: { categories: sorted } } )
				.then( function () { return sorted; } )
				.catch( function () {
					localStorage.setItem( STORAGE_CATEGORIES, JSON.stringify( sorted ) );
					return sorted;
				} );
		}
		localStorage.setItem( STORAGE_CATEGORIES, JSON.stringify( sorted ) );
		return Promise.resolve( sorted );
	}

	function resizeImageFile( file, maxSide ) {
		return new Promise( function ( resolve, reject ) {
			const reader = new FileReader();
			reader.onload = function () {
				const img = new Image();
				img.onload = function () {
					let w = img.width;
					let h = img.height;
					const m = Math.max( w, h );
					if ( m > maxSide ) {
						const scale = maxSide / m;
						w = Math.round( w * scale );
						h = Math.round( h * scale );
					}
					const canvas = document.createElement( 'canvas' );
					canvas.width = w;
					canvas.height = h;
					const ctx = canvas.getContext( '2d' );
					ctx.drawImage( img, 0, 0, w, h );
					try {
						resolve( canvas.toDataURL( 'image/jpeg', 0.82 ) );
					} catch ( err ) {
						reject( err );
					}
				};
				img.onerror = reject;
				img.src = reader.result;
			};
			reader.onerror = reject;
			reader.readAsDataURL( file );
		} );
	}

	function uploadPhotoApi( dataUrl ) {
		return apiFetch( 'inventory/upload-photo', {
			method: 'POST',
			body: { data: dataUrl },
		} ).then( function ( r ) {
			return { id: r.id, url: r.url };
		} );
	}

	const root = document.getElementById( 'inventory-app' );
	if ( ! root ) return;

	let items = [];
	let tagCatalog = [];
	let categoryCatalog = [];
	let editingId = null;
	let viewMode = 'list'; // 'list' | 'stats'

	const state = {
		search: '',
		grade: '',
		functional: '',
		tagFilter: '',
		categoryFilter: '',
	};

	function escapeHtml( s ) {
		const div = document.createElement( 'div' );
		div.textContent = s;
		return div.innerHTML;
	}

	function escapeAttr( s ) {
		return String( s )
			.replace( /&/g, '&amp;' )
			.replace( /"/g, '&quot;' )
			.replace( /'/g, '&#39;' )
			.replace( /</g, '&lt;' );
	}

	function totalQuantity() {
		return items.reduce( function ( acc, it ) {
			return acc + ( parseInt( it.quantity, 10 ) || 0 );
		}, 0 );
	}

	function filteredItems() {
		return items.filter( function ( it ) {
			if ( state.search ) {
				const q = state.search.toLowerCase();
				const hay = ( it.name || '' ) + ' ' + ( it.serial || '' ) + ( it.brand || '' ) + ' ' + ( it.tags || [] ).join( ' ' );
				if ( ! hay.toLowerCase().includes( q ) ) return false;
			}
			if ( state.grade && it.grade !== state.grade ) return false;
			if ( state.functional && it.functional !== state.functional ) return false;
			if ( state.tagFilter && ( ! it.tags || ! it.tags.includes( state.tagFilter ) ) ) return false;
			if ( state.categoryFilter && it.category !== state.categoryFilter ) return false;
			return true;
		} );
	}

	function setItems( next ) {
		items = next;
		if ( ! useApi ) {
			saveItemsToStorage( items );
		}
	}

	function renderNav() {
		return (
			'<nav class="inventory-app__nav" aria-label="Κύρια πλοήγηση">' +
			'<a href="#list" class="inventory-app__nav-link' + ( viewMode === 'list' ? ' inventory-app__nav-link--active' : '' ) + '" data-inv-view="list">Απόθεμα</a>' +
			'<a href="#stats" class="inventory-app__nav-link' + ( viewMode === 'stats' ? ' inventory-app__nav-link--active' : '' ) + '" data-inv-view="stats">Στατιστικά</a>' +
			'</nav>'
		);
	}

	function render() {
		if ( viewMode === 'stats' ) {
			renderStats();
			return;
		}
		const list = filteredItems();
		const statItems = items.length;
		const statQty = totalQuantity();

		root.innerHTML =
			'<div class="inventory-app__shell">' +
			'<div class="inventory-app__top">' +
			'<div class="inventory-app__brand">' +
			renderNav() +
			'<h1>Απόθεμα</h1>' +
			'<p>Διαχείριση προϊόντων με κατηγορία, μάρκα, φωτογραφίες, σειριακό, λειτουργικότητα, βαθμολογία και ετικέτες.</p>' +
			'</div>' +
			'<div class="inventory-app__stats">' +
			'<div class="inventory-app__stat"><div class="inventory-app__stat-value">' + statItems + '</div><div class="inventory-app__stat-label">Προϊόντα</div></div>' +
			'<div class="inventory-app__stat"><div class="inventory-app__stat-value">' + statQty + '</div><div class="inventory-app__stat-label">Συν. τεμάχια</div></div>' +
			'</div></div>' +
			'<div class="inventory-app__toolbar">' +
			'<div class="inventory-app__search"><input type="search" class="inventory-app__input" id="inv-search" placeholder="Αναζήτηση…" value="' + escapeAttr( state.search ) + '"></div>' +
			'<div class="inventory-app__filters">' +
			'<select class="inventory-app__select" id="inv-filter-category" aria-label="Φίλτρο κατηγορίας"><option value="">Όλες οι κατηγορίες</option>' +
			buildCategoryOptions() +
			'</select>' +
			'<select class="inventory-app__select" id="inv-filter-grade" aria-label="Φίλτρο βαθμού">' + buildGradeOptions() + '</select>' +
			'<select class="inventory-app__select" id="inv-filter-functional" aria-label="Φίλτρο λειτουργικότητας">' +
			'<option value="">Όλα</option>' +
			FUNCTIONAL_OPTIONS.map( function ( o ) { return '<option value="' + escapeAttr( o.value ) + '"' + ( state.functional === o.value ? ' selected' : '' ) + '>' + escapeHtml( o.label ) + '</option>'; } ).join( '' ) +
			'</select>' +
			'<select class="inventory-app__select" id="inv-filter-tag" aria-label="Φίλτρο ετικέτας">' + buildTagFilterOptions() + '</select>' +
			'</div>' +
			'<button type="button" class="inventory-app__btn inventory-app__btn--primary" id="inv-btn-new">+ Νέο προϊόν</button>' +
			'<button type="button" class="inventory-app__btn inventory-app__btn--ghost" id="inv-btn-export-csv">Εξαγωγή CSV</button>' +
			'<button type="button" class="inventory-app__btn inventory-app__btn--ghost" id="inv-btn-export">Εξαγωγή JSON</button>' +
			'<label class="inventory-app__btn inventory-app__btn--ghost" style="cursor:pointer;margin:0">Εισαγωγή JSON<input type="file" id="inv-import-file" accept="application/json" class="inventory-app__file" style="display:none"></label>' +
			'</div>' +
			'<section class="inventory-app__tags-panel" aria-labelledby="inv-tags-heading">' +
			'<h2 id="inv-tags-heading">Βιβλιοθήκη ετικετών</h2>' +
			'<p class="inventory-app__hint">Πρόσθεσε ετικέτες. Το «×» τις αφαιρεί από τη βιβλιοθήκη και από όλα τα προϊόντα.</p>' +
			'<div class="inventory-app__tag-row">' +
			'<input type="text" class="inventory-app__input inventory-app__tag-input" id="inv-new-tag" placeholder="Νέα ετικέτα…" maxlength="80">' +
			'<button type="button" class="inventory-app__btn inventory-app__btn--ghost" id="inv-add-tag">Προσθήκη</button>' +
			'</div>' +
			'<div class="inventory-app__tag-chips" id="inv-tag-chips">' + renderTagChips() + '</div></section>' +
			'<section class="inventory-app__tags-panel" aria-labelledby="inv-categories-heading">' +
			'<h2 id="inv-categories-heading">Κατηγορίες</h2>' +
			'<p class="inventory-app__hint">Πρόσθεσε κατηγορίες (π.χ. Υπολογιστής, Οθόνη). Το «×» διαγράφει.</p>' +
			'<div class="inventory-app__tag-row">' +
			'<input type="text" class="inventory-app__input inventory-app__tag-input" id="inv-new-category" placeholder="Νέα κατηγορία…" maxlength="80">' +
			'<button type="button" class="inventory-app__btn inventory-app__btn--ghost" id="inv-add-category">Προσθήκη</button>' +
			'</div>' +
			'<div class="inventory-app__tag-chips" id="inv-category-chips">' + renderCategoryChips() + '</div></section>' +
			'<div class="inventory-app__grid" id="inv-grid">' +
			( list.length ? list.map( renderCard ).join( '' ) : renderEmpty() ) +
			'</div></div>';

		bindStaticHandlers();
	}

	function buildGradeOptions() {
		let html = '<option value="">Όλοι οι βαθμοί</option>';
		GRADES.forEach( function ( g ) {
			html += '<option value="' + escapeAttr( g ) + '"' + ( state.grade === g ? ' selected' : '' ) + '>' + escapeHtml( g ) + '</option>';
		} );
		return html;
	}

	function buildCategoryOptions() {
		return categoryCatalog.map( function ( c ) {
			return '<option value="' + escapeAttr( c ) + '"' + ( state.categoryFilter === c ? ' selected' : '' ) + '>' + escapeHtml( c ) + '</option>';
		} ).join( '' );
	}

	function buildTagFilterOptions() {
		let html = '<option value="">Όλες οι ετικέτες</option>';
		tagCatalog.forEach( function ( t ) {
			html += '<option value="' + escapeAttr( t ) + '"' + ( state.tagFilter === t ? ' selected' : '' ) + '>' + escapeHtml( t ) + '</option>';
		} );
		return html;
	}

	function renderTagChips() {
		if ( ! tagCatalog.length ) return '<span class="inventory-app__chip inventory-app__chip--muted">Δεν υπάρχουν ετικέτες</span>';
		return tagCatalog.map( function ( t ) {
			return '<span class="inventory-app__chip-wrap">' +
				'<button type="button" class="inventory-app__chip" data-tag-chip="' + escapeAttr( t ) + '" title="Φίλτρο">' + escapeHtml( t ) + '</button>' +
				'<button type="button" class="inventory-app__chip-remove" data-tag-remove="' + escapeAttr( t ) + '" aria-label="Διαγραφή">×</button></span>';
		} ).join( '' );
	}

	function renderCategoryChips() {
		if ( ! categoryCatalog.length ) return '<span class="inventory-app__chip inventory-app__chip--muted">Δεν υπάρχουν κατηγορίες</span>';
		return categoryCatalog.map( function ( c ) {
			return '<span class="inventory-app__chip-wrap">' +
				'<button type="button" class="inventory-app__chip" data-category-chip="' + escapeAttr( c ) + '" title="Φίλτρο">' + escapeHtml( c ) + '</button>' +
				'<button type="button" class="inventory-app__chip-remove" data-category-remove="' + escapeAttr( c ) + '" aria-label="Διαγραφή">×</button></span>';
		} ).join( '' );
	}

	function renderEmpty() {
		return '<div class="inventory-app__empty" style="grid-column:1/-1">' +
			'<strong>Κανένα προϊόν ακόμα</strong>' +
			'Πάτησε «Νέο προϊόν» για να προσθέσεις την πρώτη εγγραφή.' +
			( useApi ? ' Τα δεδομένα αποθηκεύονται στη βάση.' : ' Τα δεδομένα αποθηκεύονται τοπικά.' ) +
			'</div>';
	}

	function getItemPhotos( it ) {
		const photos = it.photos || ( it.photo ? [ it.photo ] : [] );
		return Array.isArray( photos ) ? photos : [];
	}

	function renderCard( it ) {
		const photoList = getItemPhotos( it );
		const firstPhoto = photoList[0];
		let photoBlock;
		if ( firstPhoto ) {
			photoBlock = '<div class="inventory-app__card-photo">';
			if ( photoList.length > 1 ) {
				photoBlock += '<img src="' + escapeAttr( firstPhoto ) + '" alt=""><span class="inventory-app__card-photo-count">+' + ( photoList.length - 1 ) + '</span>';
			} else {
				photoBlock += '<img src="' + escapeAttr( firstPhoto ) + '" alt="">';
			}
			photoBlock += '</div>';
		} else {
			photoBlock = '<div class="inventory-app__card-photo inventory-app__card-photo--empty">Χωρίς φωτογραφία</div>';
		}

		const tags = ( it.tags || [] ).map( function ( t ) {
			return '<span class="inventory-app__mini-tag">' + escapeHtml( t ) + '</span>';
		} ).join( '' );

		const categoryLabel = it.category ? '<span class="inventory-app__mini-tag inventory-app__mini-tag--cat">' + escapeHtml( it.category ) + '</span>' : '';
		const brandLabel = it.brand ? '<span class="inventory-app__card-meta-brand">' + escapeHtml( it.brand ) + '</span>' : '';

		return '<article class="inventory-app__card" data-id="' + escapeAttr( it.id ) + '">' +
			photoBlock +
			'<div class="inventory-app__card-body">' +
			'<h3 class="inventory-app__card-title">' + escapeHtml( it.name || 'Χωρίς όνομα' ) + '</h3>' +
			( categoryLabel || brandLabel ? '<div class="inventory-app__card-meta-top">' + categoryLabel + brandLabel + '</div>' : '' ) +
			'<dl class="inventory-app__card-meta">' +
			'<dt>' + noAccent( 'Ποσότητα' ) + '</dt><dd>' + escapeHtml( String( it.quantity != null ? it.quantity : '—' ) ) + '</dd>' +
			'<dt>' + noAccent( 'Σειριακό' ) + '</dt><dd>' + escapeHtml( it.serial || '—' ) + '</dd>' +
			'<dt>' + noAccent( 'Λειτουργικό' ) + '</dt><dd>' + ( it.functional === 'yes' ? '<span class="inventory-app__badge inventory-app__badge--ok">Λειτουργεί</span>' : it.functional === 'no' ? '<span class="inventory-app__badge inventory-app__badge--no">Δεν λειτουργεί</span>' : '<span class="inventory-app__badge inventory-app__badge--unknown">Άγνωστο</span>' ) + '</dd>' +
			'<dt>Grade</dt><dd><span class="inventory-app__badge inventory-app__badge--grade">' + escapeHtml( it.grade || '—' ) + '</span></dd>' +
			( it.specs ? '<dt>' + noAccent( 'Άλλα χαρακτηριστικά' ) + '</dt><dd>' + escapeHtml( it.specs ) + '</dd>' : '' ) +
			'</dl>' +
			( tags ? '<div class="inventory-app__card-tags">' + tags + '</div>' : '' ) +
			'<div class="inventory-app__card-actions">' +
			'<button type="button" class="inventory-app__btn inventory-app__btn--ghost inv-print" data-id="' + escapeAttr( it.id ) + '" title="Εκτύπωση / Αποθήκευση PDF">🖨 PDF</button>' +
			'<button type="button" class="inventory-app__btn inventory-app__btn--ghost inv-edit" data-id="' + escapeAttr( it.id ) + '">Επεξεργασία</button>' +
			'<button type="button" class="inventory-app__btn inventory-app__btn--danger inv-del" data-id="' + escapeAttr( it.id ) + '">Διαγραφή</button>' +
			'</div></div></article>';
	}

	function bindStaticHandlers() {
		root.querySelectorAll( '[data-inv-view]' ).forEach( function ( el ) {
			el.addEventListener( 'click', function ( e ) {
				e.preventDefault();
				viewMode = el.getAttribute( 'data-inv-view' ) === 'stats' ? 'stats' : 'list';
				render();
			} );
		} );

		var search = document.getElementById( 'inv-search' );
		if ( search ) search.addEventListener( 'input', function () { state.search = search.value.trim(); updateGridOnly(); } );
		var fCat = document.getElementById( 'inv-filter-category' );
		if ( fCat ) fCat.addEventListener( 'change', function () { state.categoryFilter = fCat.value; updateGridOnly(); } );
		var fg = document.getElementById( 'inv-filter-grade' );
		if ( fg ) fg.addEventListener( 'change', function () { state.grade = fg.value; updateGridOnly(); } );
		var ff = document.getElementById( 'inv-filter-functional' );
		if ( ff ) ff.addEventListener( 'change', function () { state.functional = ff.value; updateGridOnly(); } );
		var ft = document.getElementById( 'inv-filter-tag' );
		if ( ft ) ft.addEventListener( 'change', function () { state.tagFilter = ft.value; updateGridOnly(); } );

		document.getElementById( 'inv-btn-new' )?.addEventListener( 'click', function () { openModal( null ); } );
		document.getElementById( 'inv-btn-export-csv' )?.addEventListener( 'click', exportCsv );
		document.getElementById( 'inv-btn-export' )?.addEventListener( 'click', exportJson );
		document.getElementById( 'inv-import-file' )?.addEventListener( 'change', importJson );
		document.getElementById( 'inv-add-tag' )?.addEventListener( 'click', addTagFromInput );
		document.getElementById( 'inv-new-tag' )?.addEventListener( 'keydown', function ( e ) { if ( e.key === 'Enter' ) { e.preventDefault(); addTagFromInput(); } } );
		document.getElementById( 'inv-add-category' )?.addEventListener( 'click', addCategoryFromInput );
		document.getElementById( 'inv-new-category' )?.addEventListener( 'keydown', function ( e ) { if ( e.key === 'Enter' ) { e.preventDefault(); addCategoryFromInput(); } } );

		root.querySelectorAll( '[data-tag-chip]' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () {
				state.tagFilter = btn.getAttribute( 'data-tag-chip' );
				render();
				var sel = document.getElementById( 'inv-filter-tag' );
				if ( sel ) sel.value = state.tagFilter;
			} );
		} );
		root.querySelectorAll( '.inventory-app__chip-remove[data-tag-remove]' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function ( e ) {
				e.preventDefault();
				e.stopPropagation();
				deleteTagFromCatalog( btn.getAttribute( 'data-tag-remove' ) );
			} );
		} );
		root.querySelectorAll( '[data-category-chip]' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () {
				state.categoryFilter = btn.getAttribute( 'data-category-chip' );
				render();
				var sel = document.getElementById( 'inv-filter-category' );
				if ( sel ) sel.value = state.categoryFilter;
			} );
		} );
		root.querySelectorAll( '.inventory-app__chip-remove[data-category-remove]' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function ( e ) {
				e.preventDefault();
				e.stopPropagation();
				deleteCategoryFromCatalog( btn.getAttribute( 'data-category-remove' ) );
			} );
		} );
		root.querySelectorAll( '.inv-edit' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () { openModal( btn.getAttribute( 'data-id' ) ); } );
		} );
		root.querySelectorAll( '.inv-del' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () {
				var id = btn.getAttribute( 'data-id' );
				if ( confirm( 'Διαγραφή αυτού του προϊόντος;' ) ) doDeleteItem( id );
			} );
		} );
		root.querySelectorAll( '.inv-print' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () { printProduct( btn.getAttribute( 'data-id' ) ); } );
		} );
	}

	function updateGridOnly() {
		var grid = document.getElementById( 'inv-grid' );
		if ( ! grid ) return;
		var list = filteredItems();
		grid.innerHTML = list.length ? list.map( renderCard ).join( '' ) : renderEmpty();
		root.querySelectorAll( '.inv-edit' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () { openModal( btn.getAttribute( 'data-id' ) ); } );
		} );
		root.querySelectorAll( '.inv-del' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () {
				if ( confirm( 'Διαγραφή αυτού του προϊόντος;' ) ) doDeleteItem( btn.getAttribute( 'data-id' ) );
			} );
		} );
		root.querySelectorAll( '.inv-print' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () { printProduct( btn.getAttribute( 'data-id' ) ); } );
		} );
		var stats = root.querySelectorAll( '.inventory-app__stat-value' );
		if ( stats.length >= 2 ) {
			stats[0].textContent = String( items.length );
			stats[1].textContent = String( totalQuantity() );
		}
	}

	function addTagFromInput() {
		var input = document.getElementById( 'inv-new-tag' );
		if ( ! input ) return;
		var v = input.value.trim();
		if ( ! v ) return;
		if ( tagCatalog.indexOf( v ) < 0 ) {
			tagCatalog.push( v );
			saveTagCatalog( tagCatalog ).then( function ( saved ) { tagCatalog = saved; render(); } );
		}
		input.value = '';
		render();
	}

	function addCategoryFromInput() {
		var input = document.getElementById( 'inv-new-category' );
		if ( ! input ) return;
		var v = input.value.trim();
		if ( ! v ) return;
		if ( categoryCatalog.indexOf( v ) < 0 ) {
			categoryCatalog.push( v );
			saveCategoryCatalog( categoryCatalog ).then( function ( saved ) { categoryCatalog = saved; render(); } );
		}
		input.value = '';
		render();
	}

	function deleteTagFromCatalog( tag ) {
		if ( ! tag || tagCatalog.indexOf( tag ) < 0 ) return;
		if ( ! confirm( 'Διαγραφή της ετικέτας «' + tag + '» από τη βιβλιοθήκη; Θα αφαιρεθεί και από όλα τα προϊόντα.' ) ) return;
		tagCatalog = tagCatalog.filter( function ( x ) { return x !== tag; } );
		saveTagCatalog( tagCatalog ).then( function ( saved ) { tagCatalog = saved; } );
		items = items.map( function ( it ) {
			var next = Object.assign( {}, it );
			next.tags = ( it.tags || [] ).filter( function ( x ) { return x !== tag; } );
			return next;
		} );
		setItems( items );
		if ( state.tagFilter === tag ) state.tagFilter = '';
		render();
	}

	function deleteCategoryFromCatalog( cat ) {
		if ( ! cat || categoryCatalog.indexOf( cat ) < 0 ) return;
		if ( ! confirm( 'Διαγραφή της κατηγορίας «' + cat + '»; Τα προϊόντα θα μείνουν χωρίς αυτή την κατηγορία.' ) ) return;
		categoryCatalog = categoryCatalog.filter( function ( x ) { return x !== cat; } );
		saveCategoryCatalog( categoryCatalog ).then( function ( saved ) { categoryCatalog = saved; } );
		items = items.map( function ( it ) {
			var next = Object.assign( {}, it );
			if ( next.category === cat ) next.category = '';
			return next;
		} );
		setItems( items );
		if ( state.categoryFilter === cat ) state.categoryFilter = '';
		render();
	}

	function exportCsv() {
		var headers = [ 'ID', noAccent( 'Όνομα' ), noAccent( 'Κατηγορία' ), noAccent( 'Μάρκα' ), noAccent( 'Ποσότητα' ), noAccent( 'Σειριακό' ), noAccent( 'Λειτουργικότητα' ), 'Grade', noAccent( 'Άλλα χαρακτηριστικά' ), noAccent( 'Ετικέτες' ) ];
		var rows = [ headers ];
		items.forEach( function ( it ) {
			rows.push( [
				it.id,
				it.name || '',
				it.category || '',
				it.brand || '',
				String( it.quantity ),
				it.serial || '',
				getFunctionalLabel( it.functional ),
				it.grade || '',
				it.specs || '',
				( it.tags || [] ).join( '; ' ),
			] );
		} );
		var csv = '\uFEFF'; // BOM for Excel
		rows.forEach( function ( row ) {
			csv += row.map( function ( cell ) {
				var s = String( cell ).replace( /"/g, '""' );
				return '"' + s + '"';
			} ).join( ',' ) + '\r\n';
		} );
		var blob = new Blob( [ csv ], { type: 'text/csv;charset=utf-8' } );
		var a = document.createElement( 'a' );
		a.href = URL.createObjectURL( blob );
		a.download = 'inventory-export-' + new Date().toISOString().slice( 0, 10 ) + '.csv';
		a.click();
		URL.revokeObjectURL( a.href );
	}

	function exportJson() {
		var payload = { exportedAt: new Date().toISOString(), items: items, tagCatalog: tagCatalog, categoryCatalog: categoryCatalog };
		var blob = new Blob( [ JSON.stringify( payload, null, 2 ) ], { type: 'application/json' } );
		var a = document.createElement( 'a' );
		a.href = URL.createObjectURL( blob );
		a.download = 'inventory-export-' + new Date().toISOString().slice( 0, 10 ) + '.json';
		a.click();
		URL.revokeObjectURL( a.href );
	}

	function importJson( e ) {
		var file = e.target.files && e.target.files[0];
		e.target.value = '';
		if ( ! file ) return;
		var reader = new FileReader();
		reader.onload = function () {
			try {
				var data = JSON.parse( reader.result );
				if ( ! data.items || ! Array.isArray( data.items ) ) { alert( 'Μη έγκυρο αρχείο JSON.' ); return; }
				if ( ! confirm( 'Η εισαγωγή θα αντικαταστήσει τα τρέχοντα δεδομένα. Συνέχεια;' ) ) return;
				items = data.items.map( function ( row ) { return normalizeItem( row ); } );
				if ( data.tagCatalog && Array.isArray( data.tagCatalog ) ) tagCatalog = data.tagCatalog;
				if ( data.categoryCatalog && Array.isArray( data.categoryCatalog ) ) categoryCatalog = data.categoryCatalog;
				saveTagCatalog( tagCatalog );
				saveCategoryCatalog( categoryCatalog );
				setItems( items );
				if ( useApi ) {
					items.forEach( function ( it ) {
						apiFetch( 'inventory/items', { method: 'POST', body: itemToApi( it ) } ).catch( function () {} );
					} );
				}
				render();
			} catch ( err ) {
				alert( 'Αποτυχία ανάγνωσης αρχείου.' );
			}
		};
		reader.readAsText( file );
	}

	function itemToApi( it ) {
		return {
			name: it.name,
			quantity: it.quantity,
			serial: it.serial,
			functional: it.functional === 'yes' || it.functional === 'no' ? it.functional : 'unknown',
			grade: it.grade,
			tags: it.tags || [],
			category: it.category || '',
			brand: it.brand || '',
			specs: it.specs || '',
			photo_ids: it.photo_ids || [],
		};
	}

	function doDeleteItem( id ) {
		if ( useApi ) {
			apiFetch( 'inventory/items/' + id, { method: 'DELETE' } )
				.then( function () { return loadItems(); } )
				.then( function ( next ) { items = next; render(); } )
				.catch( function () {
					items = items.filter( function ( x ) { return x.id !== id; } );
					setItems( items );
					render();
				} );
		} else {
			items = items.filter( function ( x ) { return x.id !== id; } );
			setItems( items );
			render();
		}
	}

	function printProduct( id ) {
		var it = items.find( function ( x ) { return x.id === id; } );
		if ( ! it ) return;
		var photos = getItemPhotos( it );
		var photosHtml = photos.map( function ( url ) {
			return '<img src="' + escapeAttr( url ) + '" alt="" style="max-width:100%;height:auto;margin:0.5rem 0;">';
		} ).join( '' );
		var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + escapeHtml( it.name || 'Προϊόν' ) + '</title>' +
			'<style>body{font-family:system-ui,sans-serif;padding:1.5rem;max-width:600px;margin:0 auto;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #ddd;padding:0.5rem;text-align:left;} th{background:#f5f5f5;}</style></head><body>' +
			'<h1>' + escapeHtml( it.name || 'Προϊόν' ) + '</h1>' +
			( photosHtml ? '<div class="photos">' + photosHtml + '</div>' : '' ) +
			'<table><tr><th>' + noAccent( 'Κατηγορία' ) + '</th><td>' + escapeHtml( it.category || '—' ) + '</td></tr>' +
			'<tr><th>' + noAccent( 'Μάρκα' ) + '</th><td>' + escapeHtml( it.brand || '—' ) + '</td></tr>' +
			'<tr><th>' + noAccent( 'Ποσότητα' ) + '</th><td>' + escapeHtml( String( it.quantity ) ) + '</td></tr>' +
			'<tr><th>' + noAccent( 'Σειριακό' ) + '</th><td>' + escapeHtml( it.serial || '—' ) + '</td></tr>' +
			'<tr><th>' + noAccent( 'Λειτουργικότητα' ) + '</th><td>' + escapeHtml( getFunctionalLabel( it.functional ) ) + '</td></tr>' +
			'<tr><th>Grade</th><td>' + escapeHtml( it.grade || '—' ) + '</td></tr>' +
			( it.specs ? '<tr><th>' + noAccent( 'Άλλα χαρακτηριστικά' ) + '</th><td>' + escapeHtml( it.specs ) + '</td></tr>' : '' ) +
			'<tr><th>' + noAccent( 'Ετικέτες' ) + '</th><td>' + escapeHtml( ( it.tags || [] ).join( ', ' ) || '—' ) + '</td></tr></table>' +
			'<p style="margin-top:1.5rem;font-size:0.875rem;color:#666;">Απόθεμα — ' + new Date().toLocaleDateString( 'el-GR' ) + '</p></body></html>';
		var w = window.open( '', '_blank' );
		w.document.write( html );
		w.document.close();
		w.focus();
		setTimeout( function () { w.print(); }, 250 );
	}

	function renderStats() {
		var byCategory = {};
		var byBrand = {};
		var byGrade = {};
		var byTag = {};
		var bySpecs = {};
		var byFunctional = { yes: 0, no: 0, unknown: 0 };
		items.forEach( function ( it ) {
			var cat = it.category || '— Χωρίς κατηγορία';
			byCategory[cat] = ( byCategory[cat] || 0 ) + 1;
			var brand = it.brand || '— Χωρίς μάρκα';
			byBrand[brand] = ( byBrand[brand] || 0 ) + 1;
			var grade = it.grade || '—';
			byGrade[grade] = ( byGrade[grade] || 0 ) + 1;
			var spec = it.specs ? it.specs.trim() : '';
			if ( spec ) {
				bySpecs[spec] = ( bySpecs[spec] || 0 ) + 1;
			}
			( it.tags || [] ).forEach( function ( t ) {
				byTag[t] = ( byTag[t] || 0 ) + 1;
			} );
			var f = it.functional === 'yes' || it.functional === 'no' ? it.functional : 'unknown';
			byFunctional[f] = ( byFunctional[f] || 0 ) + 1;
		} );

		function sortByCount( a, b ) { return ( b[1] - a[1] ); }
		var catRows = Object.entries( byCategory ).sort( sortByCount ).map( function ( e ) { return '<tr><td>' + escapeHtml( e[0] ) + '</td><td>' + e[1] + '</td></tr>'; } ).join( '' );
		var brandRows = Object.entries( byBrand ).sort( sortByCount ).map( function ( e ) { return '<tr><td>' + escapeHtml( e[0] ) + '</td><td>' + e[1] + '</td></tr>'; } ).join( '' );
		var gradeRows = Object.entries( byGrade ).sort( sortByCount ).map( function ( e ) { return '<tr><td>' + escapeHtml( e[0] ) + '</td><td>' + e[1] + '</td></tr>'; } ).join( '' );
		var tagRows = Object.entries( byTag ).sort( sortByCount ).map( function ( e ) { return '<tr><td>' + escapeHtml( e[0] ) + '</td><td>' + e[1] + '</td></tr>'; } ).join( '' );
		var specsRows = Object.entries( bySpecs ).sort( sortByCount ).map( function ( e ) { return '<tr><td>' + escapeHtml( e[0] ) + '</td><td>' + e[1] + '</td></tr>'; } ).join( '' );
		var funcRows = '<tr><td>Λειτουργεί</td><td>' + ( byFunctional.yes || 0 ) + '</td></tr><tr><td>Δεν λειτουργεί</td><td>' + ( byFunctional.no || 0 ) + '</td></tr><tr><td>Άγνωστο</td><td>' + ( byFunctional.unknown || 0 ) + '</td></tr>';

		root.innerHTML =
			'<div class="inventory-app__shell">' +
			'<div class="inventory-app__top">' +
			'<div class="inventory-app__brand">' +
			renderNav() +
			'<h1>' + noAccent( 'Στατιστικά αποθέματος' ) + '</h1>' +
			'<p>Προϊόντα ανά κατηγορία, μάρκα, βαθμό, ετικέτα, άλλα χαρακτηριστικά και λειτουργικότητα.</p>' +
			'</div></div>' +
			'<div class="inventory-app__stats-grid">' +
			'<section class="inventory-app__stats-block"><h2>' + noAccent( 'Ανά κατηγορία' ) + '</h2><table class="inventory-app__stats-table"><thead><tr><th>' + noAccent( 'Κατηγορία' ) + '</th><th>' + noAccent( 'Πλήθος' ) + '</th></tr></thead><tbody>' + catRows + '</tbody></table></section>' +
			'<section class="inventory-app__stats-block"><h2>' + noAccent( 'Ανά μάρκα' ) + '</h2><table class="inventory-app__stats-table"><thead><tr><th>' + noAccent( 'Μάρκα' ) + '</th><th>' + noAccent( 'Πλήθος' ) + '</th></tr></thead><tbody>' + brandRows + '</tbody></table></section>' +
			'<section class="inventory-app__stats-block"><h2>' + noAccent( 'Ανά grade' ) + '</h2><table class="inventory-app__stats-table"><thead><tr><th>Grade</th><th>' + noAccent( 'Πλήθος' ) + '</th></tr></thead><tbody>' + gradeRows + '</tbody></table></section>' +
			'<section class="inventory-app__stats-block"><h2>' + noAccent( 'Ανά ετικέτα' ) + '</h2><table class="inventory-app__stats-table"><thead><tr><th>' + noAccent( 'Ετικέτα' ) + '</th><th>' + noAccent( 'Πλήθος' ) + '</th></tr></thead><tbody>' + ( tagRows || '<tr><td>—</td><td>0</td></tr>' ) + '</tbody></table></section>' +
			'<section class="inventory-app__stats-block"><h2>' + noAccent( 'Άλλα χαρακτηριστικά' ) + '</h2><table class="inventory-app__stats-table"><thead><tr><th>' + noAccent( 'Χαρακτηριστικό' ) + '</th><th>' + noAccent( 'Πλήθος' ) + '</th></tr></thead><tbody>' + ( specsRows || '<tr><td>—</td><td>0</td></tr>' ) + '</tbody></table></section>' +
			'<section class="inventory-app__stats-block"><h2>' + noAccent( 'Λειτουργικότητα' ) + '</h2><table class="inventory-app__stats-table"><thead><tr><th>' + noAccent( 'Κατάσταση' ) + '</th><th>' + noAccent( 'Πλήθος' ) + '</th></tr></thead><tbody>' + funcRows + '</tbody></table></section>' +
			'</div></div>';

		root.querySelectorAll( '[data-inv-view]' ).forEach( function ( el ) {
			el.addEventListener( 'click', function ( e ) {
				e.preventDefault();
				viewMode = el.getAttribute( 'data-inv-view' ) === 'stats' ? 'stats' : 'list';
				render();
			} );
		} );
	}

	function openModal( id ) {
		editingId = id;
		var it = id ? items.find( function ( x ) { return x.id === id; } ) : null;
		var draft = it ? {
			name: it.name,
			quantity: it.quantity,
			serial: it.serial,
			functional: it.functional === 'yes' || it.functional === 'no' ? it.functional : 'unknown',
			grade: it.grade,
			tags: ( it.tags || [] ).slice(),
			category: it.category || '',
			brand: it.brand || '',
			specs: it.specs || '',
			photos: getItemPhotos( it ).slice(),
			photo_ids: ( it.photo_ids || [] ).slice(),
		} : {
			name: '',
			quantity: 1,
			serial: '',
			functional: 'unknown',
			grade: 'A',
			tags: [],
			category: '',
			brand: '',
			specs: '',
			photos: [],
			photo_ids: [],
		};

		var categoryOptions = categoryCatalog.map( function ( c ) {
			return '<option value="' + escapeAttr( c ) + '"' + ( draft.category === c ? ' selected' : '' ) + '>' + escapeHtml( c ) + '</option>';
		} ).join( '' );

		var photosPreview = draft.photos.map( function ( url, i ) {
			return '<span class="inventory-app__photo-thumb-wrap"><img class="inventory-app__photo-preview inventory-app__photo-thumb" src="' + escapeAttr( url ) + '" alt=""><button type="button" class="inventory-app__photo-remove" data-photo-index="' + i + '" aria-label="Αφαίρεση">×</button></span>';
		} ).join( '' );

		var backdrop = document.createElement( 'div' );
		backdrop.className = 'inventory-app__backdrop';
		backdrop.setAttribute( 'role', 'dialog' );
		backdrop.setAttribute( 'aria-modal', 'true' );
		backdrop.innerHTML =
			'<div class="inventory-app__modal">' +
			'<div class="inventory-app__modal-header"><h2>' + ( id ? 'Επεξεργασία προϊόντος' : 'Νέο προϊόν' ) + '</h2><button type="button" class="inventory-app__modal-close" aria-label="Κλείσιμο">&times;</button></div>' +
			'<div class="inventory-app__modal-body">' +
			'<div class="inventory-app__field"><label for="inv-f-name">Όνομα / περιγραφή</label><input type="text" class="inventory-app__input" id="inv-f-name" maxlength="200" value="' + escapeAttr( draft.name ) + '"></div>' +
			'<div class="inventory-app__field"><label for="inv-f-category">Κατηγορία</label><select class="inventory-app__select" id="inv-f-category" style="width:100%"><option value="">— Επέλεξε —</option>' + categoryOptions + '</select></div>' +
			'<div class="inventory-app__field"><label for="inv-f-brand">Μάρκα</label><input type="text" class="inventory-app__input" id="inv-f-brand" maxlength="120" value="' + escapeAttr( draft.brand ) + '" placeholder="π.χ. Dell, Apple"></div>' +
			'<div class="inventory-app__field"><label for="inv-f-specs">Άλλα χαρακτηριστικά</label><input type="text" class="inventory-app__input" id="inv-f-specs" maxlength="200" value="' + escapeAttr( draft.specs ) + '" placeholder="π.χ. 27 ιντσών, i5, i7"></div>' +
			'<div class="inventory-app__field"><label for="inv-f-photo">Φωτογραφίες (πολλαπλές)</label><input type="file" class="inventory-app__file" id="inv-f-photo" accept="image/*" multiple>' +
			'<div class="inventory-app__photo-thumbs" id="inv-f-photos">' + photosPreview + '</div><p class="inventory-app__hint">Μπορείς να προσθέσεις πολλές φωτογραφίες.</p></div>' +
			'<div class="inventory-app__field"><label for="inv-f-qty">Αριθμός τεμαχίων</label><input type="number" class="inventory-app__input" id="inv-f-qty" min="0" step="1" value="' + escapeAttr( String( draft.quantity ) ) + '"></div>' +
			'<div class="inventory-app__field"><label for="inv-f-serial">Σειριακός αριθμός</label><input type="text" class="inventory-app__input" id="inv-f-serial" maxlength="120" value="' + escapeAttr( draft.serial ) + '"></div>' +
			'<div class="inventory-app__field"><label for="inv-f-grade">Grade</label><select class="inventory-app__select" id="inv-f-grade" style="width:100%">' +
			GRADES.map( function ( g ) { return '<option value="' + escapeAttr( g ) + '"' + ( draft.grade === g ? ' selected' : '' ) + '>' + escapeHtml( g ) + '</option>'; } ).join( '' ) + '</select></div>' +
			'<div class="inventory-app__field"><label for="inv-f-functional">Λειτουργικότητα</label><select class="inventory-app__select" id="inv-f-functional" style="width:100%">' +
			FUNCTIONAL_OPTIONS.map( function ( o ) { return '<option value="' + escapeAttr( o.value ) + '"' + ( draft.functional === o.value ? ' selected' : '' ) + '>' + escapeHtml( o.label ) + '</option>'; } ).join( '' ) + '</select></div>' +
			'<div class="inventory-app__field"><span>Ετικέτες</span><div class="inventory-app__item-tags" id="inv-f-tags">' + renderModalTagPills( draft.tags ) + '</div><p class="inventory-app__hint">Ενεργοποίησε ετικέτες από τη βιβλιοθήκη.</p></div>' +
			'</div>' +
			'<div class="inventory-app__modal-footer">' +
			'<button type="button" class="inventory-app__btn inventory-app__btn--ghost" id="inv-modal-cancel">Ακύρωση</button>' +
			'<button type="button" class="inventory-app__btn inventory-app__btn--primary" id="inv-modal-save">Αποθήκευση</button>' +
			'</div></div>';

		document.body.appendChild( backdrop );

		var modalPhotos = draft.photos.slice();
		var modalPhotoIds = draft.photo_ids.slice();

		function refreshPhotoThumbs() {
			var wrap = backdrop.querySelector( '#inv-f-photos' );
			if ( ! wrap ) return;
			wrap.innerHTML = modalPhotos.map( function ( url, i ) {
				return '<span class="inventory-app__photo-thumb-wrap"><img class="inventory-app__photo-preview inventory-app__photo-thumb" src="' + escapeAttr( url ) + '" alt=""><button type="button" class="inventory-app__photo-remove" data-photo-index="' + i + '" aria-label="Αφαίρεση">×</button></span>';
			} ).join( '' );
			wrap.querySelectorAll( '.inventory-app__photo-remove' ).forEach( function ( btn ) {
				btn.addEventListener( 'click', function () {
					var idx = parseInt( btn.getAttribute( 'data-photo-index' ), 10 );
					modalPhotos.splice( idx, 1 );
					modalPhotoIds.splice( idx, 1 );
					refreshPhotoThumbs();
				} );
			} );
		}

		backdrop.querySelector( '#inv-f-photo' ).addEventListener( 'change', function () {
			var files = this.files;
			if ( ! files || ! files.length ) return;
			var pending = Array.from( files ).filter( function ( f ) { return f.type && f.type.indexOf( 'image/' ) === 0; } );
			var addOne = function ( index ) {
				if ( index >= pending.length ) { refreshPhotoThumbs(); return; }
				var f = pending[index];
				resizeImageFile( f, 800 ).then( function ( dataUrl ) {
					if ( useApi ) {
						uploadPhotoApi( dataUrl ).then( function ( r ) {
							modalPhotos.push( r.url );
							modalPhotoIds.push( r.id );
							addOne( index + 1 );
						} ).catch( function () {
							modalPhotos.push( dataUrl );
							addOne( index + 1 );
						} );
					} else {
						modalPhotos.push( dataUrl );
						addOne( index + 1 );
					}
				} ).catch( function () { addOne( index + 1 ); } );
			};
			addOne( 0 );
			this.value = '';
		} );

		backdrop.querySelector( '.inventory-app__photo-remove' ) && refreshPhotoThumbs();

		var modalTags = draft.tags.slice();
		function refreshTagPills() {
			var wrap = backdrop.querySelector( '#inv-f-tags' );
			if ( wrap ) wrap.innerHTML = renderModalTagPills( modalTags );
			wrap && wrap.querySelectorAll( '.inventory-app__tag-pill' ).forEach( function ( pill ) {
				pill.addEventListener( 'click', function () {
					var t = pill.getAttribute( 'data-tag' );
					var i = modalTags.indexOf( t );
					if ( i >= 0 ) modalTags.splice( i, 1 ); else modalTags.push( t );
					refreshTagPills();
				} );
			} );
		}
		function renderModalTagPills( selected ) {
			return tagCatalog.map( function ( t ) {
				var on = selected.indexOf( t ) >= 0;
				return '<button type="button" class="inventory-app__tag-pill' + ( on ? ' inventory-app__tag-pill--on' : '' ) + '" data-tag="' + escapeAttr( t ) + '">' + escapeHtml( t ) + '</button>';
			} ).join( '' );
		}
		refreshTagPills();

		function closeModal() { backdrop.remove(); }
		backdrop.addEventListener( 'click', function ( e ) { if ( e.target === backdrop ) closeModal(); } );
		backdrop.querySelector( '.inventory-app__modal-close' ).addEventListener( 'click', closeModal );
		backdrop.querySelector( '#inv-modal-cancel' ).addEventListener( 'click', closeModal );

		backdrop.querySelector( '#inv-modal-save' ).addEventListener( 'click', function () {
			var name = ( backdrop.querySelector( '#inv-f-name' ).value || '' ).trim() || 'Χωρίς όνομα';
			var qty = Math.max( 0, parseInt( backdrop.querySelector( '#inv-f-qty' ).value, 10 ) || 0 );
			var serial = ( backdrop.querySelector( '#inv-f-serial' ).value || '' ).trim();
			var grade = backdrop.querySelector( '#inv-f-grade' ).value || 'B';
			var functional = ( backdrop.querySelector( '#inv-f-functional' ).value || 'unknown' );
			if ( functional !== 'yes' && functional !== 'no' ) functional = 'unknown';
			var category = ( backdrop.querySelector( '#inv-f-category' ).value || '' ).trim();
			var brand = ( backdrop.querySelector( '#inv-f-brand' ).value || '' ).trim();
			var specs = ( backdrop.querySelector( '#inv-f-specs' ).value || '' ).trim();

			modalTags.forEach( function ( t ) {
				if ( tagCatalog.indexOf( t ) < 0 ) tagCatalog.push( t );
			} );
			saveTagCatalog( tagCatalog );

			var payload = {
				name: name,
				quantity: qty,
				serial: serial,
				functional: functional,
				grade: GRADES.indexOf( grade ) >= 0 ? grade : 'Unknown',
				tags: modalTags,
				category: category,
				brand: brand,
				specs: specs,
				photos: modalPhotos.slice(),
				photo_ids: modalPhotoIds.slice(),
			};

			if ( useApi ) {
				var body = { name: payload.name, quantity: payload.quantity, serial: payload.serial, functional: payload.functional, grade: payload.grade, tags: payload.tags, category: payload.category, brand: payload.brand, specs: payload.specs, photo_ids: payload.photo_ids };
				if ( id ) {
					apiFetch( 'inventory/items/' + id, { method: 'PUT', body: body } )
						.then( function ( updated ) {
							items = items.map( function ( x ) { return x.id === id ? normalizeItem( updated ) : x; } );
							closeModal();
							render();
						} )
						.catch( function () {
							alert( 'Αποτυχία ενημέρωσης. Δοκίμασε ξανά.' );
						} );
				} else {
					apiFetch( 'inventory/items', { method: 'POST', body: body } )
						.then( function ( created ) {
							items = items.concat( normalizeItem( created ) );
							closeModal();
							render();
						} )
						.catch( function () {
							alert( 'Αποτυχία δημιουργίας. Δοκίμασε ξανά.' );
						} );
				}
			} else {
				var row = {
					id: id || uid(),
					name: payload.name,
					quantity: payload.quantity,
					serial: payload.serial,
					functional: payload.functional,
					grade: payload.grade,
					tags: payload.tags,
					category: payload.category,
					brand: payload.brand,
					specs: payload.specs,
					photos: payload.photos,
					photo_ids: payload.photo_ids,
				};
				if ( id ) {
					items = items.map( function ( x ) { return x.id === id ? row : x; } );
				} else {
					items.push( row );
				}
				setItems( items );
				closeModal();
				render();
			}
		} );

		backdrop.querySelector( '#inv-f-name' ).focus();
	}

	Promise.all( [ loadItems(), loadTagCatalog(), loadCategoryCatalog() ] ).then( function ( results ) {
		items = results[0];
		tagCatalog = results[1];
		categoryCatalog = results[2];
		render();
	} );
})();

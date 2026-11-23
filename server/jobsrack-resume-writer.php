// JobsRack: AI resume writer. People type their details (or upload their old resume) and the AI
// writes a resume in the standard format for their country. Download as PDF, save to profile, apply.
// The AI key is pasted by the site owner in Settings > JobsRack AI.

/* ---------- Settings ---------- */
add_action( 'admin_menu', function () {
	add_options_page( 'JobsRack AI', 'JobsRack AI', 'manage_options', 'jobsrack-ai', function () {
		if ( isset( $_POST['jr20_save'] ) && check_admin_referer( 'jr20_ai' ) ) {
			$k = trim( (string) wp_unslash( $_POST['jr20_key'] ?? '' ) );
			if ( '' !== $k && false === strpos( $k, '•' ) ) update_option( 'jr20_ai_key', $k, false );
			if ( ! empty( $_POST['jr20_clear'] ) ) delete_option( 'jr20_ai_key' );
			update_option( 'jr20_ai_daily', max( 0, (int) ( $_POST['jr20_daily'] ?? 300 ) ), false );
			$sk = trim( (string) wp_unslash( $_POST['jr20_stripe'] ?? '' ) );
			if ( '' !== $sk && preg_match( '/^(sk|rk)_(live|test)_[A-Za-z0-9]+$/', $sk ) ) update_option( 'jr20_stripe_key', $sk, false );
			if ( ! empty( $_POST['jr20_stripe_clear'] ) ) delete_option( 'jr20_stripe_key' );
			update_option( 'jr20_paid', empty( $_POST['jr20_paid'] ) ? 'no' : 'yes', false );
			update_option( 'jr20_price', max( 0, (float) ( $_POST['jr20_price'] ?? 0 ) ), false );
			echo '<div class="updated"><p>Saved.</p></div>';
		}
		$k     = (string) get_option( 'jr20_ai_key', '' );
		$used  = (int) get_option( 'jr20_used_' . gmdate( 'Ymd' ), 0 );
		$total = (int) get_option( 'jr20_used_total', 0 );
		?>
		<div class="wrap"><h1>JobsRack AI</h1>
		<p>Powers the AI resume writer on <a href="<?php echo esc_url( home_url( '/resume-builder/' ) ); ?>" target="_blank">/resume-builder/</a> and in the app.</p>
		<form method="post"><?php wp_nonce_field( 'jr20_ai' ); ?>
		<table class="form-table">
		<tr><th>Anthropic API key</th><td><input type="password" name="jr20_key" autocomplete="off" class="regular-text" placeholder="<?php echo $k ? esc_attr( 'Saved: ' . substr( $k, 0, 10 ) . '••••' . substr( $k, -4 ) ) : 'sk-ant-…'; ?>">
			<p class="description">Create one at console.anthropic.com → API Keys. Leave empty to keep the saved key.</p>
			<?php if ( $k ) : ?><label><input type="checkbox" name="jr20_clear" value="1"> Remove the saved key</label><?php endif; ?></td></tr>
		<tr><th>Daily limit (whole site)</th><td><input type="number" name="jr20_daily" value="<?php echo (int) get_option( 'jr20_ai_daily', 300 ); ?>" min="0" class="small-text"> resumes per day
			<p class="description">Caps your AI cost. Each person can also make at most 5 a day.</p></td></tr>
		<?php $sk = (string) get_option( 'jr20_stripe_key', '' ); $cur = jr20_currency(); ?>
		<tr><th>Charge for resumes (website)</th><td><label><input type="checkbox" name="jr20_paid" value="1" <?php checked( jr20_paid() ); ?>> People pay before the AI writes their resume</label>
			<p class="description">One payment = up to 3 tries (to change details) within 7 days, and unlimited PDF downloads.</p></td></tr>
		<tr><th>Price</th><td><?php echo esc_html( strtoupper( $cur ) ); ?> <input type="number" step="0.01" min="0.5" name="jr20_price" value="<?php echo esc_attr( jr20_price() ); ?>" class="small-text"></td></tr>
		<tr><th>Stripe secret key</th><td><input type="password" name="jr20_stripe" autocomplete="off" class="regular-text" placeholder="<?php echo $sk ? esc_attr( 'Saved: ' . substr( $sk, 0, 8 ) . '••••' . substr( $sk, -4 ) ) : 'sk_live_… or rk_live_…'; ?>">
			<p class="description">Stripe Dashboard → Developers → API keys. A restricted key with only "Checkout Sessions: Write" is safest. Payments go to your Stripe account.</p>
			<?php if ( $sk ) : ?><label><input type="checkbox" name="jr20_stripe_clear" value="1"> Remove the saved key</label><?php endif; ?></td></tr>
		<tr><th>Usage</th><td>Today: <?php echo $used; ?> · All time: <?php echo $total; ?> · Paid: <?php echo (int) get_option( 'jr20_paid_count', 0 ); ?></td></tr>
		</table><p><button class="button button-primary" name="jr20_save" value="1">Save</button></p></form></div>
		<?php
	} );
} );

/* ---------- AI ---------- */
function jr20_country() {
	$s = function_exists( 'jra_site' ) ? jra_site() : 'gl';
	return in_array( $s, array( 'ca', 'in', 'au', 'gl' ), true ) ? $s : 'gl';
}
function jr20_rules( $c ) {
	$common = "Reverse-chronological format that passes applicant tracking systems (ATS): plain sections, no tables, no columns, no photos, no graphics.\n"
		. "Experience bullets start with a strong action verb, show results, and stay under 25 words. 3 to 5 bullets for recent jobs, 1 to 3 for older ones.\n"
		. "A 2 to 3 line professional summary aimed at the target job. A skills list of 6 to 12 items, the most relevant to the target job first.\n";
	$r = array(
		'ca' => "Canadian resume standard. Canadian spelling (organize, colour, centre). Never include photo, date of birth, age, gender, marital status, religion, nationality, SIN or full street address: city and province only. 1 to 2 pages.",
		'au' => "Australian resume standard. Australian spelling (organise, colour, centre). Never include photo, date of birth, age, gender, marital status or religion. City and state only. You may end with a 'Referees' line saying 'Available on request'. 2 pages at most.",
		'in' => "Indian resume standard for private-sector jobs. Clear 'Key skills' and 'Languages' if given. Indian English. Do not include photo, date of birth, father's name, marital status, religion or caste even if given. City and state only. 1 to 2 pages.",
		'gl' => "International resume standard. Neutral English. Never include photo, date of birth, age, gender, marital status or religion. City and country only. 1 to 2 pages.",
	);
	return $common . $r[ $c ];
}
function jr20_ai_call( $content ) {
	$key = (string) get_option( 'jr20_ai_key', '' );
	if ( ! $key ) return new WP_Error( 'jr', 'The AI resume writer is coming soon. Please check back shortly.', array( 'status' => 503 ) );
	$r = wp_remote_post( 'https://api.anthropic.com/v1/messages', array(
		'timeout' => 90,
		'headers' => array( 'x-api-key' => $key, 'anthropic-version' => '2023-06-01', 'content-type' => 'application/json' ),
		'body'    => wp_json_encode( array(
			'model'      => get_option( 'jr20_ai_model', 'claude-haiku-5-5' ),
			'max_tokens' => 3000,
			'system'     => 'You write excellent, honest resumes. You only use facts the person gave you: never invent employers, job titles, dates, numbers, degrees, certifications or skills they did not mention. You may rewrite and organize their words so they read professionally. Reply with JSON only, no other text.',
			'messages'   => array( array( 'role' => 'user', 'content' => $content ) ),
		) ),
	) );
	if ( is_wp_error( $r ) ) return new WP_Error( 'jr', 'The resume writer is busy. Please try again in a minute.', array( 'status' => 503 ) );
	$code = wp_remote_retrieve_response_code( $r );
	$body = json_decode( wp_remote_retrieve_body( $r ), true );
	if ( 200 !== $code ) {
		error_log( 'jr20 AI error ' . $code . ': ' . wp_remote_retrieve_body( $r ) );
		return new WP_Error( 'jr', 'The resume writer is busy. Please try again in a minute.', array( 'status' => 503 ) );
	}
	$t = '';
	foreach ( (array) ( $body['content'] ?? array() ) as $b ) if ( 'text' === ( $b['type'] ?? '' ) ) $t .= $b['text'];
	if ( preg_match( '/\{.*\}/s', $t, $m ) ) $t = $m[0];
	$j = json_decode( $t, true );
	if ( ! is_array( $j ) || empty( $j['name'] ) ) return new WP_Error( 'jr', 'Sorry, that did not work. Please add a little more detail and try again.', array( 'status' => 502 ) );
	return $j;
}
/** Plain text from an uploaded old resume (Word) or a PDF block for the AI. */
function jr20_old_resume( $field ) {
	if ( empty( $_FILES[ $field ]['tmp_name'] ) || ! empty( $_FILES[ $field ]['error'] ) ) return null;
	if ( (int) $_FILES[ $field ]['size'] > 5 * MB_IN_BYTES ) return new WP_Error( 'jr', 'Your old resume is too large. The limit is 5 MB.', array( 'status' => 400 ) );
	$ext = strtolower( pathinfo( (string) $_FILES[ $field ]['name'], PATHINFO_EXTENSION ) );
	$tmp = $_FILES[ $field ]['tmp_name'];
	if ( 'pdf' === $ext ) {
		$d = file_get_contents( $tmp );
		if ( 0 !== strpos( $d, '%PDF' ) ) return new WP_Error( 'jr', 'That file is not a PDF.', array( 'status' => 400 ) );
		return array( 'type' => 'document', 'source' => array( 'type' => 'base64', 'media_type' => 'application/pdf', 'data' => base64_encode( $d ) ) );
	}
	if ( 'docx' === $ext && class_exists( 'ZipArchive' ) ) {
		$z = new ZipArchive();
		if ( true === $z->open( $tmp ) ) {
			$x = (string) $z->getFromName( 'word/document.xml' );
			$z->close();
			$x = preg_replace( '/<\/w:p>/', "\n", $x );
			$x = preg_replace( '/<w:tab\/>/', "\t", $x );
			$t = trim( html_entity_decode( wp_strip_all_tags( $x ), ENT_QUOTES | ENT_XML1, 'UTF-8' ) );
			if ( $t ) return array( 'type' => 'text', 'text' => "Their old resume:\n" . mb_substr( $t, 0, 15000 ) );
		}
	}
	if ( in_array( $ext, array( 'txt', 'rtf' ), true ) ) return array( 'type' => 'text', 'text' => "Their old resume:\n" . mb_substr( wp_strip_all_tags( file_get_contents( $tmp ) ), 0, 15000 ) );
	return new WP_Error( 'jr', 'Please upload your old resume as a PDF or Word (.docx) file, or paste it as text.', array( 'status' => 400 ) );
}
function jr20_write( $p, $file = null ) {
	$c   = jr20_country();
	$in  = array();
	foreach ( array( 'name' => 'Full name', 'email' => 'Email', 'phone' => 'Phone', 'city' => 'City', 'linkedin' => 'LinkedIn or website', 'target' => 'Job they want', 'job_ad' => 'The job ad they are applying to', 'experience' => 'Work experience (their words)', 'education' => 'Education', 'skills' => 'Skills', 'extra' => 'Other (certificates, languages, volunteering)' ) as $k => $label ) {
		$v = trim( (string) ( $p[ $k ] ?? '' ) );
		if ( '' !== $v ) $in[] = $label . ': ' . mb_substr( $v, 0, 'job_ad' === $k || 'experience' === $k ? 8000 : 1500 );
	}
	$schema = '{"name":"","headline":"short title under the name, e.g. Warehouse Associate","contact":{"email":"","phone":"","city":"","link":""},"summary":"","skills":[""],"experience":[{"title":"","company":"","city":"","start":"Mon YYYY","end":"Mon YYYY or Present","bullets":[""]}],"education":[{"credential":"","school":"","city":"","year":""}],"certifications":[""],"languages":[""],"extras":[{"heading":"e.g. Volunteering","items":[""]}],"tips":["up to 3 short tips on what the person could add to make it stronger"]}';
	$txt    = "Write a resume for this person.\n\nFormat rules:\n" . jr20_rules( $c ) . "\n\nReturn JSON exactly in this shape (leave out empty sections, keep keys in English):\n" . $schema . "\n\nTheir details:\n" . implode( "\n", $in );
	$content = array();
	if ( $file ) $content[] = $file;
	$content[] = array( 'type' => 'text', 'text' => $txt );
	$j = jr20_ai_call( $content );
	if ( is_wp_error( $j ) ) return $j;
	return jr20_clean( $j );
}
function jr20_s( $v, $n = 300 ) { return mb_substr( trim( wp_strip_all_tags( (string) ( is_scalar( $v ) ? $v : '' ) ) ), 0, $n ); }
function jr20_list( $a, $n = 300, $max = 20 ) {
	$o = array();
	foreach ( array_slice( (array) $a, 0, $max ) as $x ) { $x = jr20_s( $x, $n ); if ( '' !== $x ) $o[] = $x; }
	return $o;
}
/** Keep only the shape we expect; anything else is dropped. Also used on edited resumes sent back for the PDF. */
function jr20_clean( $j ) {
	$c = (array) ( $j['contact'] ?? array() );
	$o = array(
		'name'     => jr20_s( $j['name'] ?? '', 80 ),
		'headline' => jr20_s( $j['headline'] ?? '', 100 ),
		'contact'  => array( 'email' => jr20_s( $c['email'] ?? '', 100 ), 'phone' => jr20_s( $c['phone'] ?? '', 40 ), 'city' => jr20_s( $c['city'] ?? '', 80 ), 'link' => jr20_s( $c['link'] ?? '', 120 ) ),
		'summary'  => jr20_s( $j['summary'] ?? '', 900 ),
		'skills'   => jr20_list( $j['skills'] ?? array(), 60, 16 ),
		'experience' => array(),
		'education'  => array(),
		'certifications' => jr20_list( $j['certifications'] ?? array(), 150, 10 ),
		'languages' => jr20_list( $j['languages'] ?? array(), 60, 8 ),
		'extras'   => array(),
		'tips'     => jr20_list( $j['tips'] ?? array(), 200, 3 ),
	);
	foreach ( array_slice( (array) ( $j['experience'] ?? array() ), 0, 12 ) as $e ) {
		$e = (array) $e;
		$x = array( 'title' => jr20_s( $e['title'] ?? '', 100 ), 'company' => jr20_s( $e['company'] ?? '', 100 ), 'city' => jr20_s( $e['city'] ?? '', 60 ), 'start' => jr20_s( $e['start'] ?? '', 20 ), 'end' => jr20_s( $e['end'] ?? '', 20 ), 'bullets' => jr20_list( $e['bullets'] ?? array(), 300, 8 ) );
		if ( $x['title'] || $x['company'] ) $o['experience'][] = $x;
	}
	foreach ( array_slice( (array) ( $j['education'] ?? array() ), 0, 8 ) as $e ) {
		$e = (array) $e;
		$x = array( 'credential' => jr20_s( $e['credential'] ?? '', 150 ), 'school' => jr20_s( $e['school'] ?? '', 120 ), 'city' => jr20_s( $e['city'] ?? '', 60 ), 'year' => jr20_s( $e['year'] ?? '', 20 ) );
		if ( $x['credential'] || $x['school'] ) $o['education'][] = $x;
	}
	foreach ( array_slice( (array) ( $j['extras'] ?? array() ), 0, 4 ) as $e ) {
		$e = (array) $e;
		$x = array( 'heading' => jr20_s( $e['heading'] ?? '', 40 ), 'items' => jr20_list( $e['items'] ?? array(), 200, 8 ) );
		if ( $x['heading'] && $x['items'] ) $o['extras'][] = $x;
	}
	return $o;
}

/* ---------- PDF (no libraries: standard Helvetica, WinAnsi) ---------- */
function jr20_w( $s, $bold, $size ) {
	static $wr = null, $wb = null;
	if ( null === $wr ) {
		$wr = array_combine( range( 32, 126 ), array( 278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584 ) );
		$wb = array_combine( range( 32, 126 ), array( 278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584 ) );
	}
	$t = $bold ? $wb : $wr;
	$w = 0;
	$n = strlen( $s );
	for ( $i = 0; $i < $n; $i++ ) { $o = ord( $s[ $i ] ); $w += $t[ $o ] ?? ( 149 === $o ? 350 : 556 ); }
	return $w * $size / 1000;
}
function jr20_enc( $s ) {
	$s   = (string) $s;
	$out = @iconv( 'UTF-8', 'Windows-1252//TRANSLIT//IGNORE', $s );
	return false === $out ? preg_replace( '/[^\x20-\x7E\x91-\x97]/', '', $s ) : $out;
}
function jr20_wrap( $s, $bold, $size, $max ) {
	$lines = array();
	$cur   = '';
	foreach ( preg_split( '/\s+/', trim( $s ) ) as $word ) {
		$try = '' === $cur ? $word : $cur . ' ' . $word;
		if ( jr20_w( $try, $bold, $size ) <= $max || '' === $cur ) { $cur = $try; continue; }
		$lines[] = $cur;
		$cur     = $word;
	}
	if ( '' !== $cur ) $lines[] = $cur;
	return $lines;
}
function jr20_pdf( $r, $country ) {
	$letter = in_array( $country, array( 'ca' ), true );
	$PW     = $letter ? 612 : 595.28;
	$PH     = $letter ? 792 : 841.89;
	$M      = 50;
	$W      = $PW - 2 * $M;
	$pages  = array();
	$ops    = '';
	$y      = $PH - $M;
	$esc    = function ( $s ) { return str_replace( array( '\\', '(', ')', "\r", "\n" ), array( '\\\\', '\\(', '\\)', '', ' ' ), $s ); };
	$newpage = function () use ( &$pages, &$ops, &$y, $PH, $M ) { if ( '' !== $ops ) $pages[] = $ops; $ops = ''; $y = $PH - $M; };
	$need = function ( $h ) use ( &$y, $M, $newpage ) { if ( $y - $h < $M ) $newpage(); };
	$text = function ( $x, $s, $bold, $size, $gray = 0 ) use ( &$ops, &$y, $esc ) {
		$g = 0 === $gray ? '0 g' : sprintf( '%.2F g', $gray );
		$ops .= sprintf( "BT %s /%s %.1F Tf %.2F %.2F Td (%s) Tj ET\n", $g, $bold ? 'F2' : 'F1', $size, $x, $y, $esc( $s ) );
	};
	$para = function ( $s, $size = 10, $indent = 0, $bold = false, $lead = 13.2 ) use ( &$y, $need, $text, $M, $W ) {
		foreach ( jr20_wrap( jr20_enc( $s ), $bold, $size, $W - $indent ) as $l ) { $need( $lead ); $y -= $lead; $text( $M + $indent, $l, $bold, $size ); }
	};
	$section = function ( $title ) use ( &$y, &$ops, $need, $text, $M, $W, $PW ) {
		$need( 40 );
		$y -= 20;
		$text( $M, strtoupper( jr20_enc( $title ) ), true, 10.5, 0.12 );
		$y -= 5;
		$ops .= sprintf( "0.75 G 0.6 w %.2F %.2F m %.2F %.2F l S\n", $M, $y, $PW - $M, $y );
	};
	$bullet = function ( $s ) use ( &$y, $need, $text, $M, $W ) {
		$lines = jr20_wrap( jr20_enc( $s ), false, 10, $W - 14 );
		foreach ( $lines as $i => $l ) { $need( 13.2 ); $y -= 13.2; if ( 0 === $i ) $text( $M + 3, "\x95", false, 10 ); $text( $M + 14, $l, false, 10 ); }
	};
	$row = function ( $left, $right, $bold = true ) use ( &$y, $need, $text, $M, $W ) {
		$need( 15 );
		$y -= 14;
		$r = jr20_enc( $right );
		$rw = jr20_w( $r, false, 9.5 );
		$l = jr20_wrap( jr20_enc( $left ), $bold, 10.5, $W - $rw - 12 );
		$text( $M, $l[0], $bold, 10.5 );
		if ( '' !== $r ) $text( $M + $W - $rw, $r, false, 9.5, 0.3 );
		for ( $i = 1; $i < count( $l ); $i++ ) { $need( 13 ); $y -= 13; $text( $M, $l[ $i ], $bold, 10.5 ); }
	};

	// Header
	$y -= 20;
	$text( $M, jr20_enc( $r['name'] ), true, 20 );
	if ( $r['headline'] ) { $y -= 16; $text( $M, jr20_enc( $r['headline'] ), false, 11.5, 0.25 ); }
	$c = array_filter( array( $r['contact']['city'], $r['contact']['phone'], $r['contact']['email'], $r['contact']['link'] ) );
	if ( $c ) { $y -= 15; $text( $M, jr20_enc( implode( '  |  ', $c ) ), false, 9.5, 0.3 ); }

	if ( $r['summary'] ) { $section( 'Professional summary' ); $y -= 2; $para( $r['summary'] ); }
	if ( $r['skills'] ) { $section( in_array( $country, array( 'in', 'au' ), true ) ? 'Key skills' : 'Skills' ); $y -= 2; $para( implode( '  ·  ', $r['skills'] ) ); }
	if ( $r['experience'] ) {
		$section( 'Work experience' );
		foreach ( $r['experience'] as $e ) {
			$y -= 4;
			$dates = trim( $e['start'] . ( $e['end'] ? ' – ' . $e['end'] : '' ), ' –' );
			$row( $e['title'], $dates );
			$sub = trim( $e['company'] . ( $e['city'] ? ', ' . $e['city'] : '' ), ', ' );
			if ( $sub ) { $need( 13 ); $y -= 13; $text( $M, jr20_enc( $sub ), false, 10, 0.25 ); }
			foreach ( $e['bullets'] as $b ) $bullet( $b );
		}
	}
	if ( $r['education'] ) {
		$section( 'Education' );
		foreach ( $r['education'] as $e ) {
			$y -= 4;
			$row( $e['credential'] ?: $e['school'], $e['year'] );
			$sub = $e['credential'] ? trim( $e['school'] . ( $e['city'] ? ', ' . $e['city'] : '' ), ', ' ) : $e['city'];
			if ( $sub ) { $need( 13 ); $y -= 13; $text( $M, jr20_enc( $sub ), false, 10, 0.25 ); }
		}
	}
	if ( $r['certifications'] ) { $section( 'Certifications' ); foreach ( $r['certifications'] as $b ) $bullet( $b ); }
	if ( $r['languages'] ) { $section( 'Languages' ); $y -= 2; $para( implode( ', ', $r['languages'] ) ); }
	foreach ( $r['extras'] as $x ) { $section( $x['heading'] ); foreach ( $x['items'] as $b ) $bullet( $b ); }
	if ( 'au' === $country ) { $section( 'Referees' ); $y -= 2; $para( 'Available on request' ); }
	$pages[] = $ops;

	// Assemble
	$objs   = array();
	$objs[] = '<< /Type /Catalog /Pages 2 0 R >>';
	$kids   = array();
	$n      = count( $pages );
	for ( $i = 0; $i < $n; $i++ ) $kids[] = ( 5 + 2 * $i ) . ' 0 R';
	$objs[] = '<< /Type /Pages /Count ' . $n . ' /Kids [' . implode( ' ', $kids ) . '] >>';
	$objs[] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
	$objs[] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
	foreach ( $pages as $i => $p ) {
		$objs[] = sprintf( '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2F %.2F] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents %d 0 R >>', $PW, $PH, 6 + 2 * $i );
		$z      = function_exists( 'gzcompress' ) ? gzcompress( $p ) : $p;
		$objs[] = '<< /Length ' . strlen( $z ) . ( $z !== $p ? ' /Filter /FlateDecode' : '' ) . " >>\nstream\n" . $z . "\nendstream";
	}
	$objs[] = '<< /Title (' . $esc( jr20_enc( $r['name'] . ' - Resume' ) ) . ') /Producer (JobsRack) >>';
	$out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
	$off = array();
	foreach ( $objs as $i => $o ) { $off[] = strlen( $out ); $out .= ( $i + 1 ) . " 0 obj\n" . $o . "\nendobj\n"; }
	$x = strlen( $out );
	$out .= "xref\n0 " . ( count( $objs ) + 1 ) . "\n0000000000 65535 f \n";
	foreach ( $off as $o ) $out .= sprintf( "%010d 00000 n \n", $o );
	$out .= 'trailer << /Size ' . ( count( $objs ) + 1 ) . ' /Root 1 0 R /Info ' . count( $objs ) . " 0 R >>\nstartxref\n" . $x . "\n%%EOF";
	return $out;
}
/** Saves the PDF in uploads. Signed-in files are kept; guest files are deleted after 2 days. */
function jr20_save_pdf( $r, $uid = 0 ) {
	$up  = wp_upload_dir();
	$sub = $uid ? '/jr-resumes' : '/jr-resumes/tmp';
	$dir = $up['basedir'] . $sub;
	if ( ! is_dir( $dir ) ) { wp_mkdir_p( $dir ); @file_put_contents( $dir . '/index.html', '' ); }
	$base = sanitize_file_name( preg_replace( '/\s+/', '-', $r['name'] ?: 'My' ) . '-Resume' );
	$file = $base . ( $uid ? '' : '-' . wp_generate_password( 8, false ) ) . '_' . gmdate( 'Y-m-d-H-i-s' ) . '.pdf';
	if ( false === file_put_contents( $dir . '/' . $file, jr20_pdf( $r, jr20_country() ) ) ) return new WP_Error( 'jr', 'Could not create the PDF. Please try again.', array( 'status' => 500 ) );
	return $up['baseurl'] . $sub . '/' . $file;
}
add_action( 'init', function () {
	$k = 'jr20_gc_' . gmdate( 'Ymd' );
	if ( get_transient( $k ) ) return;
	set_transient( $k, 1, DAY_IN_SECONDS );
	$dir = wp_upload_dir()['basedir'] . '/jr-resumes/tmp';
	foreach ( (array) glob( $dir . '/*.pdf' ) as $f ) if ( $f && filemtime( $f ) < time() - 2 * DAY_IN_SECONDS ) @unlink( $f );
} );

/* ---------- Payment (Stripe Checkout, hosted by Stripe) ---------- */
function jr20_currency() { return array( 'ca' => 'cad', 'au' => 'aud', 'in' => 'inr', 'gl' => 'usd' )[ jr20_country() ]; }
function jr20_price() {
	$p = (float) get_option( 'jr20_price', 0 );
	return $p > 0 ? $p : array( 'cad' => 2.99, 'aud' => 2.99, 'inr' => 99, 'usd' => 1.99 )[ jr20_currency() ];
}
function jr20_price_label() {
	$sym = array( 'cad' => 'CA$', 'aud' => 'A$', 'inr' => '₹', 'usd' => 'US$' )[ jr20_currency() ];
	$p   = jr20_price();
	return $sym . ( floor( $p ) == $p ? number_format( $p ) : number_format( $p, 2 ) );
}
function jr20_paid() { return 'no' !== get_option( 'jr20_paid', 'yes' ); }
function jr20_pay_ready() { return jr20_paid() && (bool) get_option( 'jr20_stripe_key' ); }
function jr20_stripe( $method, $path, $params = array() ) {
	$r = wp_remote_request( 'https://api.stripe.com/v1/' . $path, array(
		'method'  => $method,
		'timeout' => 30,
		'headers' => array( 'Authorization' => 'Bearer ' . get_option( 'jr20_stripe_key' ) ),
		'body'    => 'GET' === $method ? null : $params,
	) );
	if ( is_wp_error( $r ) ) return new WP_Error( 'jr', 'Payment service is not reachable. Please try again.', array( 'status' => 503 ) );
	$j = json_decode( wp_remote_retrieve_body( $r ), true );
	if ( wp_remote_retrieve_response_code( $r ) >= 300 ) {
		error_log( 'jr20 stripe: ' . wp_remote_retrieve_body( $r ) );
		return new WP_Error( 'jr', 'Payment could not be started. Please try again later.', array( 'status' => 502 ) );
	}
	return $j;
}
/** A paid pass: up to 3 resume writes within 7 days. */
function jr20_pass_get( $id ) {
	if ( ! preg_match( '/^cs_(live|test)_[A-Za-z0-9]{10,200}$/', (string) $id ) ) return null;
	$p = get_option( 'jr20_pass_' . md5( $id ) );
	if ( is_array( $p ) ) return $p['exp'] > time() ? $p : null;
	$s = jr20_stripe( 'GET', 'checkout/sessions/' . rawurlencode( $id ) );
	if ( is_wp_error( $s ) || 'paid' !== ( $s['payment_status'] ?? '' ) || 'jr_resume' !== ( $s['metadata']['jr'] ?? '' ) ) return null;
	if ( ( (int) ( $s['created'] ?? 0 ) ) < time() - 7 * DAY_IN_SECONDS ) return null;
	$p = array( 'uses' => 3, 'exp' => (int) $s['created'] + 7 * DAY_IN_SECONDS );
	add_option( 'jr20_pass_' . md5( $id ), $p, '', false );
	update_option( 'jr20_paid_count', (int) get_option( 'jr20_paid_count', 0 ) + 1, false );
	return $p;
}
add_action( 'init', function () {
	$k = 'jr20_passgc_' . gmdate( 'Ymd' );
	if ( get_transient( $k ) ) return;
	set_transient( $k, 1, DAY_IN_SECONDS );
	global $wpdb;
	foreach ( $wpdb->get_results( "SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE 'jr20\\_pass\\_%' LIMIT 2000" ) as $o ) {
		$v = maybe_unserialize( $o->option_value );
		if ( ! is_array( $v ) || $v['exp'] < time() ) delete_option( $o->option_name );
	}
} );

function jr20_limit( $max = 5 ) {
	$ip  = $_SERVER['REMOTE_ADDR'] ?? '';
	$uid = get_current_user_id();
	if ( current_user_can( 'manage_options' ) ) return true;
	$k = 'jr20_u_' . md5( $uid ? 'u' . $uid : $ip ) . gmdate( 'Ymd' );
	$n = (int) get_transient( $k );
	if ( $n >= $max ) return new WP_Error( 'jr', 'You have made ' . $max . ' resumes today. Please come back tomorrow.', array( 'status' => 429 ) );
	$day = 'jr20_used_' . gmdate( 'Ymd' );
	if ( (int) get_option( $day, 0 ) >= (int) get_option( 'jr20_ai_daily', 300 ) ) return new WP_Error( 'jr', 'The resume writer is very busy today. Please try again tomorrow.', array( 'status' => 429 ) );
	set_transient( $k, $n + 1, DAY_IN_SECONDS );
	return true;
}
function jr20_count() {
	$day = 'jr20_used_' . gmdate( 'Ymd' );
	update_option( $day, (int) get_option( $day, 0 ) + 1, false );
	update_option( 'jr20_used_total', (int) get_option( 'jr20_used_total', 0 ) + 1, false );
	delete_option( 'jr20_used_' . gmdate( 'Ymd', time() - 3 * DAY_IN_SECONDS ) );
}

function jr19_rate_ok( $key, $max ) {
	$k = 'jr20_rl_' . md5( $key . '|' . ( $_SERVER['REMOTE_ADDR'] ?? '' ) );
	$n = (int) get_transient( $k );
	if ( $n >= $max ) return false;
	set_transient( $k, $n + 1, HOUR_IN_SECONDS );
	return true;
}
/* ---------- REST ---------- */
add_action( 'rest_api_init', function () {
	register_rest_route( 'jobsrack/v1', '/resume/status', array( 'methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => function () {
		return array( 'ready' => (bool) get_option( 'jr20_ai_key' ), 'country' => jr20_country() );
	} ) );
	register_rest_route( 'jobsrack/v1', '/resume/checkout', array( 'methods' => 'POST', 'permission_callback' => '__return_true', 'callback' => function ( WP_REST_Request $q ) {
		if ( ! jr20_pay_ready() ) return new WP_Error( 'jr', 'Payments are not set up yet.', array( 'status' => 503 ) );
		if ( ! jr19_rate_ok( 'jr20co', 20 ) ) return new WP_Error( 'jr', 'Too many tries. Please wait a little.', array( 'status' => 429 ) );
		$back = home_url( '/resume-builder/' );
		$p    = array(
			'mode' => 'payment',
			'success_url' => $back . ( false === strpos( $back, '?' ) ? '?' : '&' ) . 'jr_paid={CHECKOUT_SESSION_ID}',
			'cancel_url'  => $back,
			'line_items[0][quantity]' => 1,
			'line_items[0][price_data][currency]' => jr20_currency(),
			'line_items[0][price_data][unit_amount]' => (int) round( jr20_price() * 100 ),
			'line_items[0][price_data][product_data][name]' => 'AI resume writing – ' . get_bloginfo( 'name' ),
			'line_items[0][price_data][product_data][description]' => 'A professional resume written for you, up to 3 versions within 7 days, PDF download.',
			'metadata[jr]' => 'jr_resume',
			'metadata[site]' => jr20_country(),
		);
		$e = sanitize_email( (string) $q->get_param( 'email' ) );
		if ( $e ) $p['customer_email'] = $e;
		$s = jr20_stripe( 'POST', 'checkout/sessions', $p );
		if ( is_wp_error( $s ) ) return $s;
		return array( 'url' => $s['url'] );
	} ) );
	register_rest_route( 'jobsrack/v1', '/resume/pass', array( 'methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => function ( WP_REST_Request $q ) {
		$p = jr20_pass_get( (string) $q->get_param( 'id' ) );
		return $p ? array( 'ok' => true, 'uses' => (int) $p['uses'], 'exp' => (int) $p['exp'] ) : array( 'ok' => false );
	} ) );
	register_rest_route( 'jobsrack/v1', '/resume/write', array( 'methods' => 'POST', 'permission_callback' => '__return_true', 'callback' => function ( WP_REST_Request $q ) {
		$p = $q->get_params();
		if ( mb_strlen( trim( (string) ( $p['name'] ?? '' ) ) ) < 2 ) return new WP_Error( 'jr', 'Please enter your full name.', array( 'status' => 400 ) );
		$file = jr20_old_resume( 'old_resume' );
		if ( is_wp_error( $file ) ) return $file;
		if ( ! $file && mb_strlen( trim( (string) ( $p['experience'] ?? '' ) . (string) ( $p['education'] ?? '' ) ) ) < 30 ) return new WP_Error( 'jr', 'Please tell us about your work or studies (a few lines is fine), or upload your old resume.', array( 'status' => 400 ) );
		if ( ! get_option( 'jr20_ai_key' ) ) return new WP_Error( 'jr', 'The AI resume writer is coming soon. Please check back shortly.', array( 'status' => 503 ) );
		// Website: paid when payments are on. The app is free (Google Play rules for in-app purchases).
		$pass_id = (string) ( $p['pass'] ?? '' );
		$is_app  = ! empty( $_SERVER['HTTP_X_JR_APP'] );
		$pass    = null;
		if ( jr20_paid() && ! $is_app && ! current_user_can( 'manage_options' ) ) {
			if ( ! jr20_pay_ready() ) return new WP_Error( 'jr', 'The AI resume writer is coming soon. Please check back shortly.', array( 'status' => 503 ) );
			$pass = jr20_pass_get( $pass_id );
			if ( ! $pass || $pass['uses'] < 1 ) return new WP_Error( 'jr', 'Please pay first to get your resume written.', array( 'status' => 402 ) );
		} else {
			$ok = jr20_limit( $is_app ? 2 : 5 );
			if ( is_wp_error( $ok ) ) return $ok;
		}
		$r = jr20_write( $p, $file );
		if ( is_wp_error( $r ) ) return $r;
		jr20_count();
		if ( $pass ) { $pass['uses']--; update_option( 'jr20_pass_' . md5( $pass_id ), $pass, false ); }
		// Contact details come from the person, not the AI.
		foreach ( array( 'email', 'phone', 'city' ) as $k ) if ( ! empty( $p[ $k ] ) ) $r['contact'][ $k ] = jr20_s( $p[ $k ], 100 );
		return array( 'resume' => $r );
	} ) );
	register_rest_route( 'jobsrack/v1', '/resume/pdf', array( 'methods' => 'POST', 'permission_callback' => '__return_true', 'callback' => function ( WP_REST_Request $q ) {
		$k = 'jr20_pdf_' . md5( $_SERVER['REMOTE_ADDR'] ?? '' );
		$n = (int) get_transient( $k );
		if ( $n >= 40 ) return new WP_Error( 'jr', 'Too many downloads. Please try again in an hour.', array( 'status' => 429 ) );
		set_transient( $k, $n + 1, HOUR_IN_SECONDS );
		$raw = $q->get_param( 'resume' );
		if ( is_string( $raw ) ) $raw = json_decode( $raw, true );
		if ( ! is_array( $raw ) ) return new WP_Error( 'jr', 'Missing resume.', array( 'status' => 400 ) );
		$r = jr20_clean( $raw );
		if ( ! $r['name'] ) return new WP_Error( 'jr', 'Please add your name.', array( 'status' => 400 ) );
		$u    = wp_get_current_user();
		$save = $u->ID && $q->get_param( 'save' ) && ( in_array( 'cs_candidate', (array) $u->roles, true ) || ! in_array( 'cs_employer', (array) $u->roles, true ) );
		$url  = jr20_save_pdf( $r, $save ? $u->ID : 0 );
		if ( is_wp_error( $url ) ) return $url;
		if ( $save ) {
			update_user_meta( $u->ID, 'cs_candidate_cv', $url );
			update_user_meta( $u->ID, 'jr_resume_json', wp_slash( wp_json_encode( $r ) ) );
			if ( $r['headline'] && ! get_user_meta( $u->ID, 'jr_headline', true ) ) update_user_meta( $u->ID, 'jr_headline', $r['headline'] );
		}
		return array( 'url' => $url, 'saved' => (bool) $save, 'name' => basename( wp_parse_url( $url, PHP_URL_PATH ) ) );
	} ) );
	register_rest_route( 'jobsrack/v1', '/resume/mine', array( 'methods' => 'GET', 'permission_callback' => 'is_user_logged_in', 'callback' => function () {
		$j = json_decode( (string) get_user_meta( get_current_user_id(), 'jr_resume_json', true ), true );
		return array( 'resume' => is_array( $j ) ? $j : null );
	} ) );
} );

/* ---------- Website page: [jr_resume_writer] at /resume-builder/ ---------- */
add_action( 'init', function () {
	if ( get_option( 'jr20_page' ) ) return;
	$id = get_page_by_path( 'resume-builder' );
	if ( ! $id ) $id = wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Free AI Resume Builder', 'post_name' => 'resume-builder', 'post_content' => '[jr_resume_writer]' ) );
	update_option( 'jr20_page', is_object( $id ) ? $id->ID : (int) $id, false );
} );
add_shortcode( 'jr_resume_writer', function () {
	if ( ! defined( 'DONOTCACHEPAGE' ) ) define( 'DONOTCACHEPAGE', true );
	$c    = jr20_country();
	$u    = wp_get_current_user();
	$cand = $u->ID && ! in_array( 'cs_employer', (array) $u->roles, true );
	$fmt  = array( 'ca' => 'Canadian', 'au' => 'Australian', 'in' => 'Indian', 'gl' => 'international' )[ $c ];
	$pre  = array(
		'name'  => $u->ID ? $u->display_name : '',
		'email' => $u->ID ? $u->user_email : '',
		'phone' => $u->ID ? (string) get_user_meta( $u->ID, 'cs_phone_number', true ) : '',
		'city'  => $u->ID ? (string) get_user_meta( $u->ID, 'jr_city', true ) : '',
	);
	ob_start();
	?>
<div id="jrrw" class="jrrw">
<style>
.jrrw{max-width:760px;margin:0 auto;font-size:16px;line-height:1.5;color:#1d2939}
.jrrw h2{font-size:28px;margin:0 0 6px}.jrrw .lead{color:#475467;margin:0 0 18px}
.jrrw label{display:block;font-weight:600;margin:14px 0 6px}.jrrw .hint{font-weight:400;color:#667085;font-size:14px}
.jrrw input[type=text],.jrrw input[type=email],.jrrw input[type=tel],.jrrw textarea{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #d0d5dd;border-radius:10px;font-size:16px;background:#fff}
.jrrw textarea{min-height:120px}.jrrw .two{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}
@media(max-width:600px){.jrrw .two{grid-template-columns:1fr}}
.jrrw .btn{display:inline-block;background:#1F7A4D;color:#fff;border:0;border-radius:10px;padding:13px 20px;font-size:16px;font-weight:700;cursor:pointer;margin:18px 10px 0 0;text-decoration:none}
.jrrw .btn.out{background:#fff;color:#1F7A4D;border:1.5px solid #1F7A4D}.jrrw .btn[disabled]{opacity:.6;cursor:wait}
.jrrw .err{color:#b42318;margin-top:12px}.jrrw .ok{color:#1F7A4D;margin-top:12px;font-weight:600}
.jrrw .paper{background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:28px;margin-top:18px;box-shadow:0 2px 10px rgba(16,24,40,.06)}
.jrrw .paper h3{font-size:24px;margin:0}.jrrw .paper .hl{color:#475467;margin:2px 0}.jrrw .paper .ct{color:#667085;font-size:14px}
.jrrw .paper h4{text-transform:uppercase;font-size:13px;letter-spacing:.06em;border-bottom:1px solid #d0d5dd;padding-bottom:4px;margin:20px 0 8px}
.jrrw .paper .row{display:flex;justify-content:space-between;gap:10px;font-weight:700;margin-top:8px}.jrrw .paper .row span{font-weight:400;color:#667085;font-size:14px;white-space:nowrap}
.jrrw .paper .sub{color:#475467;font-size:15px}.jrrw .paper ul{margin:4px 0 0 18px;padding:0}
.jrrw .tips{background:#ecfdf3;border-radius:10px;padding:12px 16px;margin-top:14px;font-size:15px}
.jrrw [contenteditable]:focus{outline:2px dashed #1F7A4D;outline-offset:2px}
</style>
<?php $paid = jr20_paid() && ! current_user_can( 'manage_options' ); ?>
<div id="jrrw-pay" style="display:none" class="paper">
<h2 style="font-size:24px">Get a professional resume written by AI</h2>
<p class="lead">Tell us about yourself or upload your old resume, and get a clean resume in the <?php echo esc_html( $fmt ); ?> format employers expect, ready as a PDF.</p>
<ul style="margin:0 0 6px 18px"><li>Written for the job you want</li><li>Up to 3 versions within 7 days</li><li>PDF download, and save it to your JobsRack profile</li></ul>
<?php if ( jr20_pay_ready() ) : ?>
<label>Your email <span class="hint">(for the receipt)</span></label><input type="email" id="jrrw-pe" value="<?php echo esc_attr( $pre['email'] ); ?>">
<button class="btn" id="jrrw-pb" type="button">Pay <?php echo esc_html( jr20_price_label() ); ?> and start</button>
<p class="hint">Secure payment by Stripe. Or get it free in the JobsRack app.</p>
<?php else : ?><p class="ok">Coming soon. Please check back shortly.</p><?php endif; ?>
<div class="err" id="jrrw-pe2"></div>
</div>
<form id="jrrw-f">
<h2>Free AI resume builder</h2>
<p class="lead">Tell us about yourself, or upload your old resume. Our AI writes a clean, professional resume in the <?php echo esc_html( $fmt ); ?> format employers expect, ready to download as a PDF.</p>
<div class="two">
<div><label>Full name *</label><input type="text" name="name" required value="<?php echo esc_attr( $pre['name'] ); ?>"></div>
<div><label>Job you want *</label><input type="text" name="target" required placeholder="e.g. Customer service representative"></div>
<div><label>Email</label><input type="email" name="email" value="<?php echo esc_attr( $pre['email'] ); ?>"></div>
<div><label>Phone</label><input type="tel" name="phone" value="<?php echo esc_attr( $pre['phone'] ); ?>"></div>
<div><label>City</label><input type="text" name="city" value="<?php echo esc_attr( $pre['city'] ); ?>"></div>
<div><label>LinkedIn or website <span class="hint">(optional)</span></label><input type="text" name="linkedin"></div>
</div>
<label>Upload your old resume <span class="hint">(optional, PDF or Word)</span></label><input type="file" name="old_resume" accept=".pdf,.docx,.txt">
<label>Your work experience <span class="hint">— job title, company, when, and what you did. Your own words are fine.</span></label>
<textarea name="experience" placeholder="e.g. Cashier at FreshCo, Brampton, March 2023 to now. Handle cash and cards, help customers, stock shelves, train new staff."></textarea>
<label>Education</label><textarea name="education" style="min-height:70px" placeholder="e.g. Diploma in Business, Sheridan College, 2022"></textarea>
<label>Skills <span class="hint">(optional)</span></label><input type="text" name="skills" placeholder="e.g. MS Excel, forklift, Punjabi, customer service">
<label>Paste the job ad <span class="hint">(optional — the resume is tailored to it)</span></label><textarea name="job_ad" style="min-height:70px"></textarea>
<button class="btn" type="submit">Write my resume</button>
<div class="err" id="jrrw-e"></div>
<p class="hint" style="margin-top:14px"><span id="jrrw-left"></span>The AI only uses what you tell it; check everything before you send it. <a href="<?php echo esc_url( home_url( '/privacy-policy/' ) ); ?>">Privacy</a></p>
</form>
<div id="jrrw-out" style="display:none">
<div class="paper" id="jrrw-p"></div>
<div class="tips" id="jrrw-t" style="display:none"></div>
<p class="hint">Tip: click any text on the resume to edit it before you download.</p>
<button class="btn" id="jrrw-dl" type="button">Download PDF</button>
<?php if ( $cand ) : ?><button class="btn out" id="jrrw-sv" type="button">Save to my profile</button><?php elseif ( ! $u->ID ) : ?><a class="btn out" href="<?php echo esc_url( home_url( '/jobs/' ) ); ?>">Find jobs to apply</a><?php endif; ?>
<button class="btn out" id="jrrw-re" type="button">Start again</button>
<div class="err" id="jrrw-e2"></div><div class="ok" id="jrrw-ok"></div>
</div>
<script>
(function(){
var api='<?php echo esc_url_raw( rest_url( 'jobsrack/v1/resume/' ) ); ?>',nonce='<?php echo esc_js( wp_create_nonce( 'wp_rest' ) ); ?>',country='<?php echo esc_js( $c ); ?>';
var f=document.getElementById('jrrw-f'),out=document.getElementById('jrrw-out'),P=document.getElementById('jrrw-p'),R=null,paid=<?php echo $paid ? 'true' : 'false'; ?>,pass='';
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k)||'';if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){return ''}}
var pay=document.getElementById('jrrw-pay');
function showPay(){pay.style.display='';f.style.display='none'}
function checkPass(id,cb){fetch(api+'pass?id='+encodeURIComponent(id),{credentials:'same-origin'}).then(function(r){return r.json()}).then(function(j){cb(j&&j.ok?j:null)}).catch(function(){cb(null)})}
function left(n){var el=document.getElementById('jrrw-left');if(el)el.textContent=paid?(n>0?n+(n==1?' version':' versions')+' left on your payment. ':''):''}
if(paid){f.style.display='none';var q=new URLSearchParams(location.search).get('jr_paid')||ls('jrrw_pass');
 if(q){checkPass(q,function(j){if(j&&j.uses>0){pass=q;ls('jrrw_pass',q);left(j.uses);f.style.display='';if(location.search.indexOf('jr_paid')>-1)history.replaceState(null,'',location.pathname)}else{ls('jrrw_pass',null);showPay()}})}else showPay()}
var pb=document.getElementById('jrrw-pb');if(pb)pb.onclick=function(){pb.disabled=true;fetch(api+'checkout',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({email:document.getElementById('jrrw-pe').value})}).then(function(r){return r.json()}).then(function(j){if(j.url)location=j.url;else{pb.disabled=false;document.getElementById('jrrw-pe2').textContent=j.message||'Could not start the payment.'}}).catch(function(){pb.disabled=false})};
function E(t){var d=document.createElement('div');d.textContent=t==null?'':t;return d.innerHTML}
function ed(path,t,tag){return '<'+(tag||'span')+' contenteditable="true" data-p="'+path+'">'+E(t)+'</'+(tag||'span')+'>'}
function render(r){
 var h='<h3>'+ed('name',r.name)+'</h3>';
 if(r.headline)h+='<div class="hl">'+ed('headline',r.headline)+'</div>';
 var c=r.contact||{};h+='<div class="ct">'+['city','phone','email','link'].filter(function(k){return c[k]}).map(function(k){return ed('contact.'+k,c[k])}).join(' &nbsp;|&nbsp; ')+'</div>';
 if(r.summary)h+='<h4>Professional summary</h4>'+ed('summary',r.summary,'div');
 if(r.skills&&r.skills.length)h+='<h4>'+(country=='in'||country=='au'?'Key skills':'Skills')+'</h4><div>'+r.skills.map(function(s,i){return ed('skills.'+i,s)}).join(' &middot; ')+'</div>';
 if(r.experience&&r.experience.length){h+='<h4>Work experience</h4>';r.experience.forEach(function(e,i){
  h+='<div class="row">'+ed('experience.'+i+'.title',e.title)+'<span>'+ed('experience.'+i+'.start',e.start)+(e.end?' – '+ed('experience.'+i+'.end',e.end):'')+'</span></div><div class="sub">'+ed('experience.'+i+'.company',e.company)+(e.city?', '+ed('experience.'+i+'.city',e.city):'')+'</div><ul>'+(e.bullets||[]).map(function(b,j){return ed('experience.'+i+'.bullets.'+j,b,'li')}).join('')+'</ul>'})}
 if(r.education&&r.education.length){h+='<h4>Education</h4>';r.education.forEach(function(e,i){h+='<div class="row">'+ed('education.'+i+'.credential',e.credential||e.school)+'<span>'+ed('education.'+i+'.year',e.year)+'</span></div>'+(e.credential?'<div class="sub">'+ed('education.'+i+'.school',e.school)+(e.city?', '+E(e.city):'')+'</div>':'')})}
 if(r.certifications&&r.certifications.length)h+='<h4>Certifications</h4><ul>'+r.certifications.map(function(b,i){return ed('certifications.'+i,b,'li')}).join('')+'</ul>';
 if(r.languages&&r.languages.length)h+='<h4>Languages</h4><div>'+r.languages.map(function(b,i){return ed('languages.'+i,b)}).join(', ')+'</div>';
 (r.extras||[]).forEach(function(x,i){h+='<h4>'+E(x.heading)+'</h4><ul>'+x.items.map(function(b,j){return ed('extras.'+i+'.items.'+j,b,'li')}).join('')+'</ul>'});
 P.innerHTML=h;
 var T=document.getElementById('jrrw-t');if(r.tips&&r.tips.length){T.style.display='';T.innerHTML='<b>Make it even stronger:</b><ul style="margin:6px 0 0 18px">'+r.tips.map(function(t){return '<li>'+E(t)+'</li>'}).join('')+'</ul>'}else T.style.display='none';
}
P.addEventListener('input',function(ev){var el=ev.target.closest('[data-p]');if(!el||!R)return;var k=el.getAttribute('data-p').split('.'),o=R;for(var i=0;i<k.length-1;i++){o=o[isNaN(k[i])?k[i]:+k[i]]}o[k[k.length-1]]=el.textContent.trim()});
f.addEventListener('submit',function(ev){ev.preventDefault();var b=f.querySelector('button[type=submit]'),e=document.getElementById('jrrw-e');e.textContent='';b.disabled=true;b.textContent='Writing your resume… (about 20 seconds)';
 var fd=new FormData(f);if(pass)fd.append('pass',pass);
 fetch(api+'write',{method:'POST',body:fd,headers:{'X-WP-Nonce':nonce},credentials:'same-origin'}).then(function(r){return r.json()}).then(function(j){
  b.disabled=false;b.textContent='Write my resume';if(!j.resume){e.textContent=j.message||'Something went wrong. Please try again.';return}
  if(paid)checkPass(pass,function(p){left(p?p.uses:0)});
  R=j.resume;render(R);f.style.display='none';out.style.display='';window.scrollTo({top:document.getElementById('jrrw').offsetTop-80,behavior:'smooth'})
 }).catch(function(){b.disabled=false;b.textContent='Write my resume';e.textContent='Network problem. Please try again.'})});
function pdf(save){var e=document.getElementById('jrrw-e2'),ok=document.getElementById('jrrw-ok');e.textContent='';ok.textContent='';
 return fetch(api+'pdf',{method:'POST',headers:{'Content-Type':'application/json','X-WP-Nonce':nonce},credentials:'same-origin',body:JSON.stringify({resume:R,save:save?1:0})}).then(function(r){return r.json()}).then(function(j){if(!j.url){e.textContent=j.message||'Could not create the PDF.';return null}return j})}
document.getElementById('jrrw-dl').onclick=function(){var w=window.open('','_blank');pdf(false).then(function(j){if(j){if(w)w.location=j.url;else location=j.url}else if(w)w.close()})};
var sv=document.getElementById('jrrw-sv');if(sv)sv.onclick=function(){sv.disabled=true;pdf(true).then(function(j){sv.disabled=false;if(j&&j.saved)document.getElementById('jrrw-ok').textContent='Saved. Employers now see this resume, and it is used when you apply.'})};
document.getElementById('jrrw-re').onclick=function(){out.style.display='none';if(paid&&!pass)showPay();else f.style.display=''};
})();
</script>
</div>
	<?php
	return ob_get_clean();
} );

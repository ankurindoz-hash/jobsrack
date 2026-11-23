// JobsRack: feature batch 1 — share buttons on job pages, job collection pages (no experience,
// part time, remote, urgent, this week, students), "Am I paid fairly?" pay checker,
// "Viewed by employer" on applications, and app endpoints for the verified badge and reporting a job.

function jr21_site() { return function_exists( 'jra_site' ) ? jra_site() : ( function_exists( 'jr3_site' ) ? jr3_site() : 'gl' ); }
function jr21_place() { return array( 'ca' => 'Canada', 'in' => 'India', 'au' => 'Australia', 'gl' => '' )[ jr21_site() ] ?? ''; }

/* ---------- 1. Share buttons on job pages ---------- */
add_filter( 'the_content', function ( $c ) {
	if ( ! is_singular( 'jobs' ) || ! in_the_loop() || ! is_main_query() ) return $c;
	$id  = get_the_ID();
	$url = get_permalink( $id );
	$t   = html_entity_decode( get_the_title( $id ), ENT_QUOTES );
	$msg = rawurlencode( $t . ' – apply on ' . get_bloginfo( 'name' ) . ': ' . $url );
	$u   = rawurlencode( $url );
	$b   = '<div class="jr21-share"><span>Share this job:</span>'
		. '<a class="wa" target="_blank" rel="noopener nofollow" href="https://wa.me/?text=' . $msg . '">WhatsApp</a>'
		. '<a class="fb" target="_blank" rel="noopener nofollow" href="https://www.facebook.com/sharer/sharer.php?u=' . $u . '">Facebook</a>'
		. '<a class="li" target="_blank" rel="noopener nofollow" href="https://www.linkedin.com/sharing/share-offsite/?url=' . $u . '">LinkedIn</a>'
		. '<a class="x" target="_blank" rel="noopener nofollow" href="https://twitter.com/intent/tweet?text=' . $msg . '">X</a>'
		. '<button type="button" class="cp" data-u="' . esc_attr( $url ) . '">Copy link</button></div>';
	return $c . $b;
}, 30 );
add_action( 'wp_footer', function () {
	if ( ! is_singular( 'jobs' ) ) return;
	?>
<style>.jr21-share{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:22px 0 8px;padding-top:14px;border-top:1px solid #eee}.jr21-share span{font-weight:600;margin-right:4px}.jr21-share a,.jr21-share button{display:inline-block;border-radius:999px;padding:7px 14px;font-size:14px;font-weight:600;text-decoration:none!important;border:0;cursor:pointer;color:#fff!important}.jr21-share .wa{background:#25D366}.jr21-share .fb{background:#1877F2}.jr21-share .li{background:#0A66C2}.jr21-share .x{background:#111}.jr21-share .cp{background:#eef2f6;color:#1d2939!important}</style>
<script>document.addEventListener('click',function(e){var b=e.target.closest('.jr21-share .cp');if(!b)return;var u=b.getAttribute('data-u');(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(function(){b.textContent='Copied!'}).catch(function(){prompt('Copy this link:',u)})});</script>
	<?php
} );

/* ---------- 2. Job collections ---------- */
function jr21_collections() {
	$in = 'in' === jr21_site();
	$p  = jr21_place();
	$where = $p ? ' in ' . $p : '';
	return array(
		'no-experience-jobs'   => array( 'k' => 'noexp', 'title' => ( $in ? 'Jobs for Freshers' : 'No Experience Jobs' ) . $where, 'h' => $in ? 'Jobs for freshers' : 'No experience needed', 'intro' => $in ? 'Entry-level jobs open to freshers: trainee, junior and graduate roles where employers train you.' : 'Entry-level jobs where employers will train you. A great way to start or change your career.' ),
		'part-time-jobs'       => array( 'k' => 'part', 'title' => 'Part Time Jobs' . $where, 'h' => 'Part-time jobs', 'intro' => 'Part-time, casual and flexible-hours jobs. Fit work around study, family or another job.' ),
		'remote-jobs'          => array( 'k' => 'remote', 'title' => 'Remote and Work From Home Jobs' . $where, 'h' => 'Remote and work from home jobs', 'intro' => 'Jobs you can do from home, fully remote or hybrid.' ),
		'urgent-hiring-jobs'   => array( 'k' => 'urgent', 'title' => 'Urgent Hiring Jobs' . $where . ': Start Immediately', 'h' => 'Urgently hiring', 'intro' => 'Employers who need people now. Many can start you within days.' ),
		'new-jobs-this-week'   => array( 'k' => 'week', 'title' => 'New Jobs This Week' . $where, 'h' => 'New jobs this week', 'intro' => 'Every job posted in the last 7 days. Apply early: the first applicants are seen first.' ),
		'student-jobs'         => array( 'k' => 'student', 'title' => ( $in ? 'Internships and Student Jobs' : 'Student Jobs' ) . $where, 'h' => $in ? 'Internships and student jobs' : 'Student jobs', 'intro' => 'Internships, co-op, summer, evening and weekend jobs that suit students.' ),
	);
}
/** Flags per active job (cached 3 hours). */
function jr21_index() {
	$c = get_transient( 'jr21_idx' );
	if ( is_array( $c ) ) return $c;
	$rows = function_exists( 'jr3_jobs' ) ? jr3_jobs() : array();
	$out  = array();
	$week = time() - 7 * DAY_IN_SECONDS;
	foreach ( $rows as $r ) {
		$id   = (int) $r['id'];
		$txt  = strtolower( $r['t'] . ' ' . wp_strip_all_tags( (string) get_post_field( 'post_content', $id ) ) );
		$tl   = strtolower( $r['t'] );
		$type = strtolower( implode( ' ', wp_get_post_terms( $id, 'job_type', array( 'fields' => 'names' ) ) ?: array() ) );
		$arr  = function_exists( 'jr6_arr' ) ? jr6_arr( $id ) : '';
		$hl   = function_exists( 'jr_hl_get' ) ? (array) jr_hl_get( $id ) : array();
		$f    = array();
		if ( preg_match( '/\b(no (prior |previous )?experience|entry[- ]level|fresher|freshers|trainee|will train|training (is )?provided|graduate trainee|0-1 years?)\b/', $txt ) || preg_match( '/\b(junior|trainee|apprentice|entry)\b/', $tl ) ) $f[] = 'noexp';
		if ( false !== strpos( $type, 'part' ) || false !== strpos( $type, 'casual' ) || preg_match( '/\bpart[- ]time\b/', $tl ) ) $f[] = 'part';
		if ( in_array( $arr, array( 'remote', 'hybrid' ), true ) || preg_match( '/\b(remote|work from home|wfh)\b/', $tl ) ) $f[] = 'remote';
		if ( ! empty( $hl['urgent'] ) || preg_match( '/\b(urgent(ly)?|immediate start|start immediately|asap|immediate joiners?)\b/', $txt ) ) $f[] = 'urgent';
		if ( $r['d'] >= $week ) $f[] = 'week';
		if ( preg_match( '/\b(student|students|intern|internship|co-?op|summer job|weekend|evening shift)\b/', $txt ) ) $f[] = 'student';
		if ( $f ) $out[ $id ] = $f;
	}
	set_transient( 'jr21_idx', $out, 3 * HOUR_IN_SECONDS );
	return $out;
}
add_action( 'save_post_jobs', function () { delete_transient( 'jr21_idx' ); } );
function jr21_collection_jobs( $k ) {
	$idx = jr21_index();
	$out = array();
	foreach ( function_exists( 'jr3_jobs' ) ? jr3_jobs() : array() as $r ) if ( isset( $idx[ $r['id'] ] ) && in_array( $k, $idx[ $r['id'] ], true ) ) $out[] = $r;
	usort( $out, function ( $a, $b ) { return $b['d'] <=> $a['d']; } );
	return $out;
}
add_action( 'init', function () {
	if ( 'v1' === get_option( 'jr21_pages' ) ) return;
	foreach ( jr21_collections() as $slug => $c ) {
		if ( get_page_by_path( $slug ) ) continue;
		wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $c['title'], 'post_name' => $slug, 'post_content' => '[jr_collection k="' . $c['k'] . '"]' ) );
	}
	if ( ! get_page_by_path( 'pay-checker' ) ) wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Am I Paid Fairly? Free Pay Checker', 'post_name' => 'pay-checker', 'post_content' => '[jr_pay_checker]' ) );
	update_option( 'jr21_pages', 'v1', false );
} );
function jr21_css() {
	static $done = false;
	if ( $done ) return '';
	$done = true;
	return '<style>.jr21{font-size:16px;line-height:1.55;color:#1d2939}.jr21 .lead{color:#475467;margin:0 0 16px}.jr21 .jl{list-style:none;padding:0;margin:0}.jr21 .jl li{border:1px solid #e4e7ec;border-radius:12px;padding:13px 15px;margin:0 0 10px;background:#fff}.jr21 .jl a.t{font-weight:700;font-size:17px}.jr21 .jl .m{color:#667085;font-size:14px}.jr21 .more{display:flex;flex-wrap:wrap;gap:8px;margin:22px 0}.jr21 .more a{border:1px solid #1F7A4D;color:#1F7A4D;border-radius:999px;padding:6px 14px;font-size:14px;font-weight:600;text-decoration:none}.jr21 .more a.on{background:#1F7A4D;color:#fff}.jr21 .pager{margin:16px 0;display:flex;gap:10px}.jr21 .pager a{font-weight:700}.jr21 .card{border:1px solid #e4e7ec;border-radius:14px;padding:20px;background:#fff;margin:0 0 18px}.jr21 label{display:block;font-weight:600;margin:12px 0 5px}.jr21 input,.jr21 select{width:100%;box-sizing:border-box;padding:11px;border:1px solid #d0d5dd;border-radius:10px;font-size:16px;background:#fff}.jr21 .row3{display:grid;grid-template-columns:2fr 1fr 1fr;gap:0 12px}@media(max-width:640px){.jr21 .row3{grid-template-columns:1fr}}.jr21 .btn{display:inline-block;background:#1F7A4D;color:#fff!important;border:0;border-radius:10px;padding:12px 20px;font-size:16px;font-weight:700;margin-top:16px;cursor:pointer;text-decoration:none}.jr21 .verdict{font-size:24px;font-weight:800;margin:4px 0}.jr21 .bar{position:relative;height:12px;border-radius:6px;background:linear-gradient(90deg,#fecdca,#fef0c7,#d1fadf);margin:26px 0 8px}.jr21 .bar i{position:absolute;top:-8px;width:4px;height:28px;background:#1d2939;border-radius:2px}.jr21 .bar b{position:absolute;top:-30px;transform:translateX(-50%);font-size:13px;white-space:nowrap}.jr21 .scale{display:flex;justify-content:space-between;color:#667085;font-size:13px}.jr21 .wa{display:inline-block;background:#25D366;color:#fff!important;border-radius:999px;padding:8px 16px;font-weight:700;text-decoration:none;margin-top:12px}</style>';
}
function jr21_li( $r ) {
	if ( function_exists( 'jr3_job_li' ) ) return jr3_job_li( $r );
	return '<li><a class="t" href="' . esc_url( get_permalink( $r['id'] ) ) . '">' . esc_html( $r['t'] ) . '</a></li>';
}
add_shortcode( 'jr_collection', function ( $a ) {
	$a    = shortcode_atts( array( 'k' => '' ), $a );
	$cols = jr21_collections();
	$me   = null;
	foreach ( $cols as $slug => $c ) if ( $c['k'] === $a['k'] ) $me = $c;
	if ( ! $me ) return '';
	$jobs = jr21_collection_jobs( $a['k'] );
	$per  = 30;
	$pg   = max( 1, (int) ( $_GET['pg'] ?? 1 ) );
	$all  = count( $jobs );
	$jobs = array_slice( $jobs, ( $pg - 1 ) * $per, $per );
	$h    = jr21_css() . '<div class="jr21"><p class="lead">' . esc_html( $me['intro'] ) . '</p>';
	if ( $jobs ) {
		$h .= '<ul class="jl">';
		foreach ( $jobs as $r ) $h .= jr21_li( $r );
		$h .= '</ul>';
		$base = get_permalink();
		$h   .= '<div class="pager">' . ( $pg > 1 ? '<a href="' . esc_url( 2 === $pg ? $base : add_query_arg( 'pg', $pg - 1, $base ) ) . '">← Newer</a>' : '' ) . ( $pg * $per < $all ? '<a href="' . esc_url( add_query_arg( 'pg', $pg + 1, $base ) ) . '">Older →</a>' : '' ) . '</div>';
	} else {
		$h .= '<p>No jobs here right now. New jobs are added every day: <a href="' . esc_url( home_url( '/jobs/' ) ) . '">see all jobs</a>.</p>';
	}
	$h .= '<div class="more">';
	foreach ( $cols as $slug => $c ) $h .= '<a class="' . ( $c['k'] === $a['k'] ? 'on' : '' ) . '" href="' . esc_url( home_url( '/' . $slug . '/' ) ) . '">' . esc_html( $c['h'] ) . '</a>';
	$h .= '<a href="' . esc_url( home_url( '/pay-checker/' ) ) . '">Am I paid fairly?</a><a href="' . esc_url( home_url( '/resume-builder/' ) ) . '">AI resume builder</a></div></div>';
	return $h;
} );
// Page 2+ of a collection: no index (avoids thin duplicates)
add_filter( 'rank_math/frontend/robots', function ( $r ) {
	if ( is_page() && ! empty( $_GET['pg'] ) && has_shortcode( (string) get_post_field( 'post_content', get_queried_object_id() ), 'jr_collection' ) ) $r['index'] = 'noindex';
	return $r;
} );
// Keep the collection pages fresh in the page cache
add_action( 'save_post_jobs', function () {
	if ( ! function_exists( 'wpfc_clear_post_cache_by_id' ) ) return;
	foreach ( array_keys( jr21_collections() ) as $slug ) { $p = get_page_by_path( $slug ); if ( $p ) wpfc_clear_post_cache_by_id( $p->ID ); }
}, 20 );

/* ---------- 3. Am I paid fairly? ---------- */
function jr21_pay_check( $title, $city, $amount, $period ) {
	if ( ! function_exists( 'jr3_jobs' ) || ! function_exists( 'jr3_stats' ) ) return null;
	$n    = function_exists( 'jr3_norm_title' ) ? jr3_norm_title( $title ) : strtolower( trim( $title ) );
	$c    = function_exists( 'jr3_norm_city' ) ? jr3_norm_city( $city ) : $city;
	$rows = array_filter( jr3_jobs(), function ( $r ) use ( $n ) { return $r['p'] > 0 && ( $r['n'] === $n || ( strlen( $n ) > 3 && false !== stripos( $r['n'], $n ) ) ); } );
	$local = $c ? array_filter( $rows, function ( $r ) use ( $c ) { return 0 === strcasecmp( $r['c'], $c ); } ) : array();
	$use   = count( $local ) >= 3 ? $local : $rows;
	$s     = jr3_stats( $use );
	if ( ! $s || $s['n'] < 2 ) return array( 'n' => 0 );
	$hours = 'in' === jr21_site() ? 0 : 2080;
	$year  = array( 'hour' => $hours ?: 2496, 'day' => 260, 'week' => 52, 'month' => 12, 'year' => 1 )[ $period ] * $amount;
	$p     = array_values( array_map( function ( $r ) { return $r['p']; }, $use ) );
	sort( $p );
	$below = 0;
	foreach ( $p as $v ) if ( $v < $year ) $below++;
	$pct = (int) round( 100 * $below / count( $p ) );
	return array( 'n' => $s['n'], 'local' => count( $local ) >= 3, 'med' => $s['med'], 'min' => $s['min'], 'max' => $s['max'], 'year' => $year, 'pct' => $pct );
}
add_shortcode( 'jr_pay_checker', function () {
	if ( 'gl' === jr21_site() ) {
		$h = jr21_css() . '<div class="jr21"><p class="lead">Pay is different in every country, so the pay checker works on each country site. Choose yours:</p><div class="more">';
		foreach ( array( 'ca' => 'Canada', 'in' => 'India', 'au' => 'Australia' ) as $k => $l ) $h .= '<a href="https://' . $k . '.jobsrack.com/pay-checker/">Am I paid fairly in ' . $l . '?</a>';
		return $h . '</div></div>';
	}
	if ( ! function_exists( 'jr3_money' ) ) return '<p>Coming soon.</p>';
	$in     = 'in' === jr21_site();
	$t      = sanitize_text_field( wp_unslash( $_GET['t'] ?? '' ) );
	$c      = sanitize_text_field( wp_unslash( $_GET['c'] ?? '' ) );
	$a      = (float) ( $_GET['a'] ?? 0 );
	$per    = sanitize_key( $_GET['per'] ?? ( $in ? 'month' : 'hour' ) );
	if ( ! in_array( $per, array( 'hour', 'day', 'week', 'month', 'year' ), true ) ) $per = 'hour';
	$titles = array();
	foreach ( jr3_jobs() as $r ) if ( $r['p'] > 0 && '' !== $r['n'] ) $titles[ $r['n'] ] = ( $titles[ $r['n'] ] ?? 0 ) + 1;
	arsort( $titles );
	$titles = array_slice( array_keys( $titles ), 0, 300 );
	$h  = jr21_css() . '<div class="jr21"><p class="lead">Compare your pay with real job ads on ' . esc_html( get_bloginfo( 'name' ) ) . '. Free and private: we do not store what you enter.</p>';
	$h .= '<form class="card" method="get"><label>Your job title</label><input name="t" list="jr21t" required value="' . esc_attr( $t ) . '" placeholder="e.g. Warehouse associate"><datalist id="jr21t">';
	foreach ( $titles as $x ) $h .= '<option value="' . esc_attr( $x ) . '">';
	$h .= '</datalist><div class="row3"><div><label>City <span style="font-weight:400;color:#667085">(optional)</span></label><input name="c" value="' . esc_attr( $c ) . '"></div><div><label>Your pay</label><input name="a" type="number" step="0.01" min="0" required value="' . ( $a ? esc_attr( $a ) : '' ) . '"></div><div><label>Per</label><select name="per">';
	foreach ( array( 'hour' => 'Hour', 'day' => 'Day', 'week' => 'Week', 'month' => 'Month', 'year' => 'Year' ) as $k => $l ) $h .= '<option value="' . $k . '"' . selected( $per, $k, false ) . '>' . $l . '</option>';
	$h .= '</select></div></div><button class="btn">Check my pay</button></form>';
	if ( $t && $a > 0 ) {
		$r = jr21_pay_check( $t, $c, $a, $per );
		if ( ! $r || ! $r['n'] ) {
			$h .= '<div class="card"><b>Not enough pay data for "' . esc_html( $t ) . '" yet.</b> Try a more general title, e.g. "cook" instead of "line cook".</div>';
		} else {
			$v    = $r['pct'] >= 60 ? array( 'You are paid well 🎉', '#027a48' ) : ( $r['pct'] >= 35 ? array( 'Your pay is about average', '#b54708' ) : array( 'You may be underpaid', '#b42318' ) );
			$span = max( 1, $r['max'] - $r['min'] );
			$pos  = max( 0, min( 100, ( $r['year'] - $r['min'] ) / $span * 100 ) );
			$med  = max( 0, min( 100, ( $r['med'] - $r['min'] ) / $span * 100 ) );
			$unit = $in ? 'month' : 'hour';
			$h   .= '<div class="card"><div class="verdict" style="color:' . $v[1] . '">' . esc_html( $v[0] ) . '</div>';
			$h   .= '<p>You earn more than <b>' . (int) $r['pct'] . '%</b> of ' . (int) $r['n'] . ' "' . esc_html( $t ) . '" jobs advertised' . ( $r['local'] ? ' in ' . esc_html( $c ) : '' ) . ' on ' . esc_html( get_bloginfo( 'name' ) ) . '.</p>';
			$h   .= '<div class="bar"><i style="left:' . round( $med, 1 ) . '%;background:#98a2b3"></i><i style="left:' . round( $pos, 1 ) . '%"><b>You</b></i></div><div class="scale"><span>' . esc_html( jr3_money( $r['min'], $unit ) ) . '</span><span>Typical: ' . esc_html( jr3_money( $r['med'], $unit ) ) . '</span><span>' . esc_html( jr3_money( $r['max'], $unit ) ) . '</span></div>';
			$jobs = array_filter( jr3_jobs(), function ( $x ) use ( $r, $t ) { $n = function_exists( 'jr3_norm_title' ) ? jr3_norm_title( $t ) : $t; return $x['p'] > $r['year'] && ( $x['n'] === $n || false !== stripos( $x['n'], $n ) ); } );
			usort( $jobs, function ( $x, $y ) { return $y['p'] <=> $x['p']; } );
			if ( $jobs ) {
				$h .= '<h3 style="margin-top:22px">Jobs that pay more than you get now</h3><ul class="jl">';
				foreach ( array_slice( $jobs, 0, 8 ) as $x ) $h .= jr21_li( $x );
				$h .= '</ul>';
			}
			$share = rawurlencode( 'Am I paid fairly as a ' . $t . '? Check yours free: ' . home_url( '/pay-checker/' ) );
			$h    .= '<a class="wa" target="_blank" rel="noopener" href="https://wa.me/?text=' . $share . '">Share the pay checker on WhatsApp</a></div>';
		}
	}
	$h .= '<p style="font-size:13px;color:#667085">Based on the pay in job ads currently on ' . esc_html( get_bloginfo( 'name' ) ) . '. Yearly pay is worked out at ' . ( $in ? '12 months' : '40 hours a week' ) . '. See also: <a href="' . esc_url( home_url( '/salaries/' ) ) . '">salaries by job</a>.</p></div>';
	return $h;
} );
// Result pages (?t=...) are personal: keep them out of Google, and out of the page cache.
add_filter( 'rank_math/frontend/robots', function ( $r ) {
	if ( is_page( 'pay-checker' ) && ! empty( $_GET['t'] ) ) $r['index'] = 'noindex';
	return $r;
} );
add_action( 'template_redirect', function () {
	if ( is_page( 'pay-checker' ) && ! empty( $_GET['t'] ) && ! defined( 'DONOTCACHEPAGE' ) ) define( 'DONOTCACHEPAGE', true );
} );

/* ---------- 4. App: verified badge, report a job, "viewed by employer" ---------- */
add_action( 'rest_api_init', function () {
	register_rest_route( 'jobsrack/v1', '/job/(?P<id>\d+)/extra', array( 'methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => function ( WP_REST_Request $r ) {
		$id = (int) $r['id'];
		if ( 'jobs' !== get_post_type( $id ) ) return new WP_Error( 'jr', 'Not found', array( 'status' => 404 ) );
		return array( 'verified' => function_exists( 'jr_job_is_verified' ) && jr_job_is_verified( $id ) );
	} ) );
	register_rest_route( 'jobsrack/v1', '/job/(?P<id>\d+)/report', array( 'methods' => 'POST', 'permission_callback' => '__return_true', 'callback' => function ( WP_REST_Request $r ) {
		$id = (int) $r['id'];
		if ( 'jobs' !== get_post_type( $id ) ) return new WP_Error( 'jr', 'This job is no longer available.', array( 'status' => 404 ) );
		$reason = sanitize_text_field( (string) $r->get_param( 'reason' ) );
		if ( '' === $reason ) return new WP_Error( 'jr', 'Please choose a reason.', array( 'status' => 400 ) );
		$key = 'jr_rep_' . md5( $_SERVER['REMOTE_ADDR'] ?? '' );
		$n   = (int) get_transient( $key );
		if ( $n >= 5 ) return new WP_Error( 'jr', 'Too many reports. Please try again later.', array( 'status' => 429 ) );
		set_transient( $key, $n + 1, HOUR_IN_SECONDS );
		$details = sanitize_textarea_field( (string) $r->get_param( 'details' ) );
		$u       = wp_get_current_user();
		update_post_meta( $id, 'jr_reports', (int) get_post_meta( $id, 'jr_reports', true ) + 1 );
		$body = 'A job was reported in the JobsRack app (' . home_url() . ")\n\nJob: " . get_the_title( $id ) . "\n" . get_permalink( $id ) . "\nEdit: " . admin_url( 'post.php?post=' . $id . '&action=edit' ) . "\n\nReason: $reason\nDetails: " . ( $details ?: '-' ) . "\nReporter: " . ( $u->ID ? $u->user_email : 'not signed in' ) . "\nTotal reports on this job: " . (int) get_post_meta( $id, 'jr_reports', true ) . "\n";
		wp_mail( 'support@jobsrack.com', 'Job reported: ' . get_the_title( $id ), $body, $u->ID ? array( 'Reply-To: ' . $u->user_email ) : array() );
		return array( 'ok' => true, 'message' => 'Thank you. We will review this job.' );
	} ) );
} );
// When an employer opens a job's applicants in the app, each new applicant is marked "viewed" once.
add_filter( 'rest_request_after_callbacks', function ( $res, $handler, $req ) {
	if ( is_wp_error( $res ) || 'GET' !== $req->get_method() ) return $res;
	if ( ! preg_match( '#^/jobsrack/v1/employer/jobs/(\d+)/applicants$#', $req->get_route(), $m ) ) return $res;
	$job  = (int) $m[1];
	$data = $res instanceof WP_REST_Response ? $res->get_data() : $res;
	foreach ( (array) $data as $a ) {
		$uid = (int) ( is_array( $a ) ? ( $a['user_id'] ?? 0 ) : 0 );
		if ( ! $uid || get_user_meta( $uid, 'jr_viewed_' . $job, true ) ) continue;
		update_user_meta( $uid, 'jr_viewed_' . $job, time() );
		if ( function_exists( 'jr19_push' ) ) jr19_push( $uid, 'An employer viewed your application', '"' . html_entity_decode( get_the_title( $job ), ENT_QUOTES ) . '": the employer has seen your application.', array( 'type' => 'app', 'jobId' => $job ) );
	}
	return $res;
}, 10, 3 );
// Add "viewed" time to the job seeker's application list in the app
add_filter( 'rest_request_after_callbacks', function ( $res, $handler, $req ) {
	if ( is_wp_error( $res ) || 'GET' !== $req->get_method() || '/jobsrack/v1/me/applications' !== $req->get_route() ) return $res;
	$uid  = get_current_user_id();
	$resp = $res instanceof WP_REST_Response;
	$data = $resp ? $res->get_data() : $res;
	foreach ( (array) $data as $i => $a ) {
		if ( is_array( $a ) && isset( $a['job']['id'] ) ) $data[ $i ]['viewed'] = (int) get_user_meta( $uid, 'jr_viewed_' . (int) $a['job']['id'], true );
	}
	if ( $resp ) { $res->set_data( $data ); return $res; }
	return $data;
}, 10, 3 );

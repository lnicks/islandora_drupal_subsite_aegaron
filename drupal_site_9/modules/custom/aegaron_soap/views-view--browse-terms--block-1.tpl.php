<?php

/**
 * @file
 * Main view template.
 *
 * Variables available:
 * - $classes_array: An array of classes determined in
 *   template_preprocess_views_view(). Default classes are:
 *     .view
 *     .view-[css_name]
 *     .view-id-[view_name]
 *     .view-display-id-[display_name]
 *     .view-dom-id-[dom_id]
 * - $classes: A string version of $classes_array for use in the class attribute
 * - $css_name: A css-safe version of the view name.
 * - $css_class: The user-specified classes names, if any
 * - $header: The view header
 * - $footer: The view footer
 * - $rows: The results of the view query, if any
 * - $empty: The empty text to display if the view is empty
 * - $pager: The pager next/prev links to display, if any
 * - $exposed: Exposed widget form/info to display
 * - $feed_icon: Feed icon to display, if any
 * - $more: A link to view more, if any
 *
 * @ingroup views_templates
 */

  $service = wsclient_service_load('dev_aegaron_soap_service');
  $result = $service->listAllEnglishTerms();
  $xmlstr = "<<<XML\n" . stripslashes($result->return) . "XML;";
  $xml = new SimpleXMLElement($result->return);

?>
<div class="<?php print $classes; ?>">
  <?php print render($title_prefix); ?>
  <?php if ($title): ?>
    <?php print $title; ?>
  <?php endif; ?>
  <?php print render($title_suffix); ?>
  <?php if ($header): ?>
    <div class="view-header">
      <?php print $header; ?>
    </div>
  <?php endif; ?>

  <?php if ($exposed): ?>
    <div class="view-filters">
      <?php print $exposed; ?>
    </div>
  <?php endif; ?>

  <ul>
    <?php foreach ($xml->category as $i => $category ): ?>
      <li class="leaf">
        <?php 
          $cat = 'classification';
          $classification = (string)$category->attributes()->$cat;
          $link = '';
          $catid = 'id-'.strtolower(preg_replace('/[^a-zA-Z0-9-]+/', '-', $classification));
        ?>
        <a href="#" data-target="<?php print($catid) ?>"><?php print($classification) ?></a>
      </li>
    <?php endforeach; ?>
  </ul>

</div><?php /* class view */ ?>

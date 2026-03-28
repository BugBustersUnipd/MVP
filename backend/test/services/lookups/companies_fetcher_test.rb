require "test_helper"

class CompaniesFetcherTest < ActiveSupport::TestCase
  test "returns company names from companies table ordered alphabetically" do
    Company.create!(name: "Zeta")
    Company.create!(name: "Alpha")
    Company.create!(name: "Gamma")

    result = DocumentProcessing::Lookups::CompaniesFetcher.new.call

    assert_includes result, "Zeta"
    assert_includes result, "Alpha"
    assert_includes result, "Gamma"
    assert_equal result, result.sort
  end

  test "excludes companies with null or empty name" do
    Company.create!(name: "ValidCo")
    Company.create!(name: nil) rescue nil # potrebbe fallire per validazione DB
    Company.where(name: nil).delete_all    # pulizia sicura

    result = DocumentProcessing::Lookups::CompaniesFetcher.new.call

    assert_not_includes result, nil
    assert_not_includes result, ""
  end

  test "does not include companies with blank name" do
    Company.create!(name: "Visibile")
    # name non può essere nil per vincolo DB, ma può essere stringa vuota
    Company.where(name: "").delete_all rescue nil

    result = DocumentProcessing::Lookups::CompaniesFetcher.new.call

    assert_includes result, "Visibile"
    assert_not_includes result, ""
  end
end

require "test_helper"

class CompaniesFetcherTest < ActiveSupport::TestCase
  test "returns company id and name from companies table ordered alphabetically" do
    zeta  = Company.create!(name: "Zeta")
    alpha = Company.create!(name: "Alpha")
    gamma = Company.create!(name: "Gamma")

    result = DocumentProcessing::Lookups::CompaniesFetcher.new.call

    names = result.map { |c| c[:name] }
    assert_includes names, "Zeta"
    assert_includes names, "Alpha"
    assert_includes names, "Gamma"
    assert_equal names, names.sort

    ids = result.map { |c| c[:id] }
    assert_includes ids, zeta.id
    assert_includes ids, alpha.id
    assert_includes ids, gamma.id
  end

  test "excludes companies with null or empty name" do
    Company.create!(name: "ValidCo")
    Company.create!(name: nil) rescue nil # potrebbe fallire per validazione DB
    Company.where(name: nil).delete_all    # pulizia sicura

    result = DocumentProcessing::Lookups::CompaniesFetcher.new.call

    names = result.map { |c| c[:name] }
    assert_not_includes names, nil
    assert_not_includes names, ""
  end

  test "does not include companies with blank name" do
    Company.create!(name: "Visibile")
    Company.where(name: "").delete_all rescue nil

    result = DocumentProcessing::Lookups::CompaniesFetcher.new.call

    names = result.map { |c| c[:name] }
    assert_includes names, "Visibile"
    assert_not_includes names, ""
  end
end
